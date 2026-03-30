from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import delete, func, select

from app import crud
from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
)
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Expense,
    ExpenseShare,
    GroupMember,
    Message,
    SplitGroup,
    UpdatePassword,
    User,
    UserCreate,
    UserCreateOpen,
    UserContactOut,
    UserOut,
    UsersOut,
    UserUpdate,
    UserUpdateMe,
    UserActivityRow,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter()


@router.get(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UsersOut
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """

    count_statement = select(func.count()).select_from(User)
    count = session.exec(count_statement).one()

    statement = select(User).offset(skip).limit(limit)
    users = session.exec(statement).all()

    return UsersOut(data=users, count=count)


@router.post(
    "/", dependencies=[Depends(get_current_active_superuser)], response_model=UserOut
)
def create_user(*, session: SessionDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    user = crud.create_user(session=session, user_create=user_in)
    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.patch("/me", response_model=UserOut)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    """
    Update own user.
    """

    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )
    user_data = user_in.model_dump(exclude_unset=True)
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """
    Update own password.
    """
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    hashed_password = get_password_hash(body.new_password)
    current_user.hashed_password = hashed_password
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserOut)
def read_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/me/contacts", response_model=list[UserContactOut])
def read_user_contacts(session: SessionDep, current_user: CurrentUser) -> Any:
    """
    List active users who share at least one group with current user.
    """

    # Find all groups the current user participates in.
    group_id_rows = session.exec(
        select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)
    ).all()

    group_ids = [
        row[0] if isinstance(row, tuple) else row  # type: ignore[assignment]
        for row in group_id_rows
    ]

    if not group_ids:
        return []

    # Find other participants in those same groups.
    # `session.exec(...).all()` returns a list of `tuple` values for aggregate/select expressions.
    other_user_id_rows = session.exec(
        select(func.distinct(GroupMember.user_id)).where(
            GroupMember.group_id.in_(group_ids),
            GroupMember.user_id != current_user.id,
        )
    ).all()

    other_user_ids = [
        row[0] if isinstance(row, tuple) else row  # type: ignore[assignment]
        for row in other_user_id_rows
    ]

    if not other_user_ids:
        return []

    users = session.exec(
        select(User)
        .where(User.id.in_(other_user_ids))
        .where(User.is_active == True)  # noqa: E712
    ).all()

    out = [UserContactOut(id=u.id, email=u.email, full_name=u.full_name) for u in users]
    out.sort(key=lambda x: (x.full_name or x.email).lower())
    return out


@router.get("/me/activity", response_model=list[UserActivityRow])
def read_user_activity(
    session: SessionDep, current_user: CurrentUser, limit: int = 50
) -> Any:
    """
    Recent user-scoped activity across all groups where user is involved.
    """

    safe_limit = min(max(limit, 1), 200)
    expenses = session.exec(select(Expense).order_by(Expense.created_at.desc())).all()

    rows: list[UserActivityRow] = []
    for e in expenses:
        shares = session.exec(
            select(ExpenseShare).where(ExpenseShare.expense_id == e.id)
        ).all()

        user_share = 0.0
        for s in shares:
            if s.user_id == current_user.id:
                user_share = float(s.amount)
                break

        involved = e.paid_by_user_id == current_user.id or user_share > 0.0
        if not involved:
            continue

        g = session.get(SplitGroup, e.group_id)
        if not g:
            continue

        payer = session.get(User, e.paid_by_user_id)
        payer_name = (
            payer.full_name
            if payer and payer.full_name
            else (payer.email if payer else f"#{e.paid_by_user_id}")
        )

        user_paid = float(e.amount) if e.paid_by_user_id == current_user.id else 0.0
        user_net = round(user_paid - user_share, 2)
        if user_net > 0.005:
            direction = "you_lent"
        elif user_net < -0.005:
            direction = "you_owe"
        else:
            direction = "settled"

        desc = e.description or ""
        if desc.startswith("[SETTLE]"):
            desc = desc.replace("[SETTLE]", "", 1).strip()

        rows.append(
            UserActivityRow(
                expense_id=e.id,
                group_id=e.group_id,
                group_name=g.name,
                description=desc,
                created_at=e.created_at,
                total_amount=round(float(e.amount), 2),
                paid_by_user_id=e.paid_by_user_id,
                paid_by_name=payer_name,
                user_share_amount=round(user_share, 2),
                user_net_amount=user_net,
                direction=direction,
            )
        )
        if len(rows) >= safe_limit:
            break

    return rows


@router.post("/open", response_model=UserOut)
def create_user_open(session: SessionDep, user_in: UserCreateOpen) -> Any:
    """
    Create new user without the need to be logged in.
    """
    if not settings.USERS_OPEN_REGISTRATION:
        raise HTTPException(
            status_code=403,
            detail="Open user registration is forbidden on this server",
        )
    user = crud.get_user_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user_create = UserCreate.from_orm(user_in)
    user = crud.create_user(session=session, user_create=user_create)
    return user


@router.get("/{user_id}", response_model=UserOut)
def read_user_by_id(
    user_id: int, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Get a specific user by id.
    """
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserOut,
)
def update_user(
    *,
    session: SessionDep,
    user_id: int,
    user_in: UserUpdate,
) -> Any:
    """
    Update a user.
    """

    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=409, detail="User with this email already exists"
            )

    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}")
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: int
) -> Message:
    """
    Delete a user.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    elif user != current_user and not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    elif user == current_user and current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )

    if session.exec(select(Expense).where(Expense.paid_by_user_id == user_id)).first():
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a user who is the recorded payer on expenses; delete those expenses first",
        )
    created_groups = session.exec(
        select(SplitGroup).where(SplitGroup.created_by_id == user_id)
    ).all()
    for g in created_groups:
        if session.exec(select(Expense).where(Expense.group_id == g.id)).first():
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a user who created split groups with expenses; delete those group expenses first",
            )
        if session.exec(select(GroupMember).where(GroupMember.group_id == g.id)).first():
            raise HTTPException(
                status_code=400,
                detail="Cannot delete a user who created split groups that still have members; remove all members first",
            )
        session.delete(g)
    session.exec(delete(ExpenseShare).where(ExpenseShare.user_id == user_id))
    session.exec(delete(GroupMember).where(GroupMember.user_id == user_id))
    session.delete(user)
    session.commit()
    return Message(message="User deleted successfully")
