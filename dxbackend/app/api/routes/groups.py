"""Split groups & expenses — simplified Splitwise-style API."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import desc
from sqlmodel import Session, delete, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    AddMemberByEmail,
    BalanceRow,
    BalancesOut,
    Expense,
    ExpenseCreate,
    ExpenseOut,
    ExpenseShare,
    ExpenseShareOut,
    ExpensesPageOut,
    GroupCreate,
    GroupDetailOut,
    GroupMember,
    GroupMemberOut,
    GroupOut,
    Message,
    SettlementRow,
    SettleUpRequest,
    SettlementTransferIn,
    SplitGroup,
    User,
)
from app import crud

router = APIRouter()

SETTLE_PREFIX = "[SETTLE]"


def _split_equal_cents(total_cents: int, n: int) -> list[int]:
    if n <= 0:
        return []
    base = total_cents // n
    rem = total_cents % n
    return [base + (1 if i < rem else 0) for i in range(n)]


def _member_user_ids(session: Session, group_id: int) -> set[int]:
    rows = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    return {r.user_id for r in rows}


def _ensure_member(session: Session, group_id: int, user_id: int) -> None:
    if user_id not in _member_user_ids(session, group_id):
        raise HTTPException(status_code=403, detail="Not a member of this group")


def _load_member_rows(session: Session, group_id: int) -> list[GroupMemberOut]:
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    out: list[GroupMemberOut] = []
    for m in members:
        u = session.get(User, m.user_id)
        if not u:
            continue
        out.append(
            GroupMemberOut(user_id=u.id, email=u.email, full_name=u.full_name)
        )
    return out


def _expense_to_out(session: Session, e: Expense) -> ExpenseOut:
    shares = session.exec(select(ExpenseShare).where(ExpenseShare.expense_id == e.id)).all()
    return ExpenseOut(
        id=e.id,
        group_id=e.group_id,
        description=e.description,
        amount=e.amount,
        paid_by_user_id=e.paid_by_user_id,
        created_at=e.created_at,
        shares=[ExpenseShareOut(user_id=s.user_id, amount=s.amount) for s in shares],
    )


def _compute_balances(session: Session, group_id: int) -> dict[int, float]:
    """Net balance per user: positive => others owe this user overall."""
    balances: dict[int, float] = {}
    members = session.exec(select(GroupMember).where(GroupMember.group_id == group_id)).all()
    for m in members:
        balances[m.user_id] = 0.0

    expenses = session.exec(select(Expense).where(Expense.group_id == group_id)).all()
    for e in expenses:
        payer = e.paid_by_user_id
        balances[payer] = balances.get(payer, 0.0) + e.amount
        shares = session.exec(select(ExpenseShare).where(ExpenseShare.expense_id == e.id)).all()
        for s in shares:
            balances[s.user_id] = balances.get(s.user_id, 0.0) - s.amount
    return balances


def _settlements_from_balances(
    session: Session, balances: dict[int, float]
) -> list[SettlementRow]:
    creditors: list[tuple[int, float]] = []
    debtors: list[tuple[int, float]] = []
    for uid, b in balances.items():
        if b > 0.005:
            creditors.append((uid, b))
        elif b < -0.005:
            debtors.append((uid, -b))
    creditors.sort(key=lambda x: -x[1])
    debtors.sort(key=lambda x: -x[1])
    i = j = 0
    out: list[SettlementRow] = []
    while i < len(creditors) and j < len(debtors):
        cu, c_amt = creditors[i]
        du, d_amt = debtors[j]
        pay = round(min(c_amt, d_amt), 2)
        if pay <= 0:
            break
        u_from = session.get(User, du)
        u_to = session.get(User, cu)
        if not u_from or not u_to:
            raise HTTPException(status_code=500, detail="User missing in settlement")
        out.append(
            SettlementRow(
                from_user_id=du,
                from_email=u_from.email,
                to_user_id=cu,
                to_email=u_to.email,
                amount=pay,
            )
        )
        c_amt = round(c_amt - pay, 2)
        d_amt = round(d_amt - pay, 2)
        if c_amt < 0.01:
            i += 1
        else:
            creditors[i] = (cu, c_amt)
        if d_amt < 0.01:
            j += 1
        else:
            debtors[j] = (du, d_amt)
    return out


def _settlements_for_user(
    session: Session,
    balances: dict[int, float],
    user_id: int,
    max_amount: float | None = None,
) -> list[SettlementRow]:
    """
    Create transfers that settle *only* the given user's net balance to ~0.

    Uses the same sign convention as balances:
    - positive => others owe this user overall
    - negative => this user owes others overall
    """

    threshold = 0.005
    my_bal = balances.get(user_id, 0.0)
    if abs(my_bal) <= threshold:
        return []

    u_me = session.get(User, user_id)
    if not u_me:
        raise HTTPException(status_code=500, detail="User missing in settlement")

    def disp_name(u: User) -> str:
        # Keep emails for now; frontend can display full_name where available in balances UI.
        return u.full_name or u.email

    my_name = disp_name(u_me)

    def round2(n: float) -> float:
        return round(n + 1e-12, 2)

    out: list[SettlementRow] = []

    if my_bal > threshold:
        # Others owe me => debtors pay me.
        remaining = round2(my_bal)
        if max_amount is not None:
            remaining = round2(min(remaining, max_amount))
        debtors: list[tuple[int, float]] = [
            (uid, -b) for uid, b in balances.items() if uid != user_id and b < -threshold
        ]
        debtors.sort(key=lambda x: -x[1])
        for du, d_amt in debtors:
            if remaining <= threshold:
                break
            pay = round2(min(remaining, d_amt))
            if pay <= threshold:
                break
            u_from = session.get(User, du)
            if not u_from:
                raise HTTPException(status_code=500, detail="User missing in settlement")
            out.append(
                SettlementRow(
                    from_user_id=du,
                    from_email=disp_name(u_from),
                    to_user_id=user_id,
                    to_email=my_name,
                    amount=pay,
                )
            )
            remaining = round2(remaining - pay)
    else:
        # I owe others => I pay creditors.
        remaining = round2(-my_bal)
        if max_amount is not None:
            remaining = round2(min(remaining, max_amount))
        creditors: list[tuple[int, float]] = [
            (uid, b) for uid, b in balances.items() if uid != user_id and b > threshold
        ]
        creditors.sort(key=lambda x: -x[1])
        for cu, c_amt in creditors:
            if remaining <= threshold:
                break
            pay = round2(min(remaining, c_amt))
            if pay <= threshold:
                break
            u_to = session.get(User, cu)
            if not u_to:
                raise HTTPException(status_code=500, detail="User missing in settlement")
            out.append(
                SettlementRow(
                    from_user_id=user_id,
                    from_email=my_name,
                    to_user_id=cu,
                    to_email=disp_name(u_to),
                    amount=pay,
                )
            )
            remaining = round2(remaining - pay)

    return out


@router.get("/", response_model=list[GroupOut])
def list_groups(*, session: SessionDep, current_user: CurrentUser) -> list[GroupOut]:
    member_rows = session.exec(
        select(GroupMember).where(GroupMember.user_id == current_user.id)
    ).all()
    group_ids = {m.group_id for m in member_rows}
    result: list[GroupOut] = []
    for gid in group_ids:
        g = session.get(SplitGroup, gid)
        if g:
            result.append(GroupOut(id=g.id, name=g.name, created_by_id=g.created_by_id))
    return sorted(result, key=lambda x: x.name.lower())


@router.post("/", response_model=GroupDetailOut)
def create_group(
    *, session: SessionDep, current_user: CurrentUser, body: GroupCreate
) -> GroupDetailOut:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")

    group = SplitGroup(name=name, created_by_id=current_user.id)
    session.add(group)
    session.commit()
    session.refresh(group)
    assert group.id is not None

    session.add(GroupMember(group_id=group.id, user_id=current_user.id))

    for raw_email in body.member_emails:
        email = raw_email.strip().lower()
        if not email or email == current_user.email.lower():
            continue
        user = crud.get_user_by_email(session=session, email=email)
        if not user:
            raise HTTPException(
                status_code=400,
                detail=f"No user registered with email: {email}",
            )
        exists = session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group.id,
                GroupMember.user_id == user.id,
            )
        ).first()
        if not exists:
            session.add(GroupMember(group_id=group.id, user_id=user.id))

    session.commit()
    g = session.get(SplitGroup, group.id)
    assert g is not None
    return GroupDetailOut(
        id=g.id,
        name=g.name,
        created_by_id=g.created_by_id,
        members=_load_member_rows(session, g.id),
    )


@router.get("/{group_id}", response_model=GroupDetailOut)
def get_group(
    *, session: SessionDep, current_user: CurrentUser, group_id: int
) -> GroupDetailOut:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)
    return GroupDetailOut(
        id=g.id,
        name=g.name,
        created_by_id=g.created_by_id,
        members=_load_member_rows(session, g.id),
    )


@router.post("/{group_id}/members", response_model=GroupDetailOut)
def add_member(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int,
    body: AddMemberByEmail,
) -> GroupDetailOut:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found for that email")

    exists = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
        )
    ).first()
    if not exists:
        session.add(GroupMember(group_id=group_id, user_id=user.id))
        session.commit()

    g2 = session.get(SplitGroup, group_id)
    assert g2 is not None
    return GroupDetailOut(
        id=g2.id,
        name=g2.name,
        created_by_id=g2.created_by_id,
        members=_load_member_rows(session, g2.id),
    )


@router.delete("/{group_id}/members/me", response_model=Message)
def leave_group(
    *, session: SessionDep, current_user: CurrentUser, group_id: int
) -> Message:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    row = session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    ).first()
    if row:
        session.delete(row)
        session.commit()
    return Message(message="Left group")


@router.get("/{group_id}/expenses", response_model=ExpensesPageOut)
def list_expenses(
    *, session: SessionDep, current_user: CurrentUser, group_id: int
) -> ExpensesPageOut:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    expenses = session.exec(
        select(Expense)
        .where(Expense.group_id == group_id)
        .where(Expense.description.notlike(f"{SETTLE_PREFIX}%"))
        .order_by(desc(Expense.created_at))
    ).all()
    data = [_expense_to_out(session, e) for e in expenses]
    return ExpensesPageOut(data=data, count=len(data))


@router.post("/{group_id}/expenses", response_model=ExpenseOut)
def create_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int,
    body: ExpenseCreate,
) -> ExpenseOut:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    desc = body.description.strip()
    if not desc:
        raise HTTPException(status_code=400, detail="Description is required")
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    members = _member_user_ids(session, group_id)
    if body.paid_by_user_id not in members:
        raise HTTPException(status_code=400, detail="Payer must be a group member")

    pids = list(dict.fromkeys(body.participant_user_ids))
    if not pids:
        raise HTTPException(status_code=400, detail="Select at least one participant")
    for pid in pids:
        if pid not in members:
            raise HTTPException(
                status_code=400, detail="All participants must be group members"
            )

    total_cents = int(round(body.amount * 100))
    parts = _split_equal_cents(total_cents, len(pids))
    if sum(parts) != total_cents:
        raise HTTPException(status_code=500, detail="Split rounding error")

    exp = Expense(
        group_id=group_id,
        description=desc,
        amount=body.amount,
        paid_by_user_id=body.paid_by_user_id,
    )
    session.add(exp)
    session.commit()
    session.refresh(exp)
    assert exp.id is not None

    for uid, cents in zip(pids, parts):
        amt = round(cents / 100.0, 2)
        session.add(ExpenseShare(expense_id=exp.id, user_id=uid, amount=amt))
    session.commit()
    session.refresh(exp)
    return _expense_to_out(session, exp)


@router.delete("/{group_id}/expenses/{expense_id}", response_model=Message)
def delete_expense(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int,
    expense_id: int,
) -> Message:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    exp = session.get(Expense, expense_id)
    if not exp or exp.group_id != group_id:
        raise HTTPException(status_code=404, detail="Expense not found")

    session.exec(delete(ExpenseShare).where(ExpenseShare.expense_id == expense_id))
    session.delete(exp)
    session.commit()
    return Message(message="Expense deleted")

@router.post("/{group_id}/settle", response_model=Message)
def settle_group_up(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    group_id: int,
    body: SettleUpRequest | None = None,
) -> Message:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    raw = _compute_balances(session, group_id)
    my_balance = round(raw.get(current_user.id, 0.0), 2)
    max_settle_amount = round(abs(my_balance), 2)

    settlements: list[SettlementRow]
    transfers_in: list[SettlementTransferIn] = []
    settle_amount: float | None = None
    if body:
        transfers_in = body.transfers
        settle_amount = body.amount
        if settle_amount is not None:
            if settle_amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Settlement amount must be greater than 0",
                )
            if settle_amount - max_settle_amount > 0.005:
                raise HTTPException(
                    status_code=400,
                    detail=f"Settlement amount cannot exceed {max_settle_amount:.2f}",
                )

    # Custom transfers: use exactly what frontend sent.
    if transfers_in:
        me_id = current_user.id
        u_me = session.get(User, me_id)
        if not u_me:
            raise HTTPException(status_code=500, detail="User missing in settlement")

        settlements = []
        custom_total = 0.0
        for t in transfers_in:
            if t.amount <= 0:
                continue
            if t.from_user_id != me_id and t.to_user_id != me_id:
                raise HTTPException(
                    status_code=400,
                    detail="Custom settlement transfers must include the current user",
                )
            # Direction must match current user's net position.
            # If I owe (negative balance), I can only be the payer.
            # If I'm owed (positive balance), I can only be the receiver.
            if my_balance < -0.005 and t.from_user_id != me_id:
                raise HTTPException(
                    status_code=400,
                    detail="Custom transfers cannot collect money when you owe others",
                )
            if my_balance > 0.005 and t.to_user_id != me_id:
                raise HTTPException(
                    status_code=400,
                    detail="Custom transfers cannot pay out when others owe you",
                )
            u_from = session.get(User, t.from_user_id)
            u_to = session.get(User, t.to_user_id)
            if not u_from or not u_to:
                raise HTTPException(status_code=500, detail="User missing in settlement")
            custom_total = round(custom_total + float(t.amount), 2)
            settlements.append(
                SettlementRow(
                    from_user_id=t.from_user_id,
                    from_email=u_from.full_name or u_from.email,
                    to_user_id=t.to_user_id,
                    to_email=u_to.full_name or u_to.email,
                    amount=round(t.amount, 2),
                )
            )
        if custom_total - max_settle_amount > 0.005:
            raise HTTPException(
                status_code=400,
                detail=f"Custom settlement total cannot exceed {max_settle_amount:.2f}",
            )
    else:
        # Full or partial settlement generated by backend.
        settlements = _settlements_for_user(
            session,
            raw,
            current_user.id,
            max_amount=settle_amount,
        )
    if not settlements:
        return Message(message="You're settled — nothing to do.")

    for s in settlements:
        amt = round(s.amount, 2)
        exp = Expense(
            group_id=group_id,
            description=f"{SETTLE_PREFIX} {s.from_email} pays {s.to_email}",
            amount=amt,
            paid_by_user_id=s.from_user_id,
        )
        session.add(exp)
        session.flush()  # make exp.id available
        if exp.id is None:
            raise HTTPException(status_code=500, detail="Failed to create settlement")
        session.add(
            ExpenseShare(
                expense_id=exp.id,
                user_id=s.to_user_id,
                amount=amt,
            )
        )

    session.commit()
    return Message(message=f"Settled {len(settlements)} transfer(s) for you.")


@router.get("/{group_id}/balances", response_model=BalancesOut)
def get_balances(
    *, session: SessionDep, current_user: CurrentUser, group_id: int
) -> BalancesOut:
    g = session.get(SplitGroup, group_id)
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    _ensure_member(session, group_id, current_user.id)

    raw = _compute_balances(session, group_id)
    balance_rows: list[BalanceRow] = []
    for uid, bal in sorted(raw.items(), key=lambda x: x[0]):
        u = session.get(User, uid)
        if not u:
            continue
        balance_rows.append(
            BalanceRow(
                user_id=uid,
                email=u.email,
                full_name=u.full_name,
                balance=round(bal, 2),
            )
        )
    settlements = _settlements_from_balances(session, raw)
    return BalancesOut(balances=balance_rows, settlements=settlements)
