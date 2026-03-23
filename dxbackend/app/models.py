from datetime import datetime, timezone
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# --- User (auth) ---


class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = None


class UserCreate(UserBase):
    password: str


class UserCreateOpen(SQLModel):
    email: str
    password: str
    full_name: str | None = None


class UserUpdate(UserBase):
    email: str | None = None  # type: ignore
    password: str | None = None


class UserUpdateMe(SQLModel):
    full_name: str | None = None
    email: str | None = None


class UpdatePassword(SQLModel):
    current_password: str
    new_password: str


class User(UserBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str


class UserOut(UserBase):
    id: int


class UserContactOut(SQLModel):
    id: int
    email: str
    full_name: str | None = None


class UsersOut(SQLModel):
    data: list[UserOut]
    count: int


# --- Split groups & expenses (Splitwise-style) ---


class SplitGroup(SQLModel, table=True):
    """A shared group for splitting bills (e.g. trip, apartment, dinner)."""

    __tablename__ = "split_group"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    created_by_id: int = Field(foreign_key="user.id")


class GroupMember(SQLModel, table=True):
    __tablename__ = "group_member"

    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="split_group.id", index=True)
    user_id: int = Field(foreign_key="user.id", index=True)


class Expense(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    group_id: int = Field(foreign_key="split_group.id", index=True)
    description: str
    amount: float
    paid_by_user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utc_now)


class ExpenseShare(SQLModel, table=True):
    """How much each participant owes for one expense (equal split stored per row)."""

    id: int | None = Field(default=None, primary_key=True)
    expense_id: int = Field(foreign_key="expense.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    amount: float


# --- API schemas ---


class GroupCreate(SQLModel):
    name: str
    member_emails: list[str] = Field(default_factory=list)


class GroupMemberOut(SQLModel):
    user_id: int
    email: str
    full_name: str | None = None


class GroupOut(SQLModel):
    id: int
    name: str
    created_by_id: int


class GroupDetailOut(SQLModel):
    id: int
    name: str
    created_by_id: int
    members: list[GroupMemberOut]


class AddMemberByEmail(SQLModel):
    email: str


class ExpenseCreate(SQLModel):
    description: str
    amount: float
    paid_by_user_id: int
    participant_user_ids: list[int]


class ExpenseShareOut(SQLModel):
    user_id: int
    amount: float


class ExpenseOut(SQLModel):
    id: int
    group_id: int
    description: str
    amount: float
    paid_by_user_id: int
    created_at: datetime
    shares: list[ExpenseShareOut]


class ExpensesPageOut(SQLModel):
    data: list[ExpenseOut]
    count: int


class BalanceRow(SQLModel):
    user_id: int
    email: str
    full_name: str | None = None
    balance: float  # >0 = net creditor (others owe you)


class SettlementRow(SQLModel):
    from_user_id: int
    from_email: str
    to_user_id: int
    to_email: str
    amount: float


class SettlementTransferIn(SQLModel):
    """User-provided settlement transfer for custom settlement amounts."""

    from_user_id: int
    to_user_id: int
    amount: float


class SettleUpRequest(SQLModel):
    """
    Optional settlement request payload.

    - If `transfers` is provided, backend uses those transfers as-is (custom amounts).
    - Otherwise, if `amount` is provided, backend generates transfers for the current user up to that amount (partial).
    - If neither is provided, backend settles the user's balance fully.
    """

    amount: float | None = None
    transfers: list[SettlementTransferIn] = Field(default_factory=list)


class BalancesOut(SQLModel):
    balances: list[BalanceRow]
    settlements: list[SettlementRow]


class UserActivityRow(SQLModel):
    expense_id: int
    group_id: int
    group_name: str
    description: str
    created_at: datetime
    total_amount: float
    paid_by_user_id: int
    paid_by_name: str
    user_share_amount: float
    user_net_amount: float
    direction: str  # you_lent | you_owe | settled


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: int | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str
