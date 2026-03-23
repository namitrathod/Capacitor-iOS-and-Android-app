"""Create fixed demo users for local testing (groups + splits)."""

from sqlmodel import Session, select

from app import crud
from app.core.config import settings
from app.models import User, UserCreate

# Four accounts — same password for easy QA. Only inserted when ENVIRONMENT=local.
DEMO_USERS: list[tuple[str, str, str]] = [
    ("split1@splitkit.test", "Alex", "Test1234!"),
    ("split2@splitkit.test", "Blake", "Test1234!"),
    ("split3@splitkit.test", "Casey", "Test1234!"),
    ("split4@splitkit.test", "Dana", "Test1234!"),
]


def seed_local_demo_users(session: Session) -> int:
    """
    Ensure demo users exist. Returns count of newly created users.
    No-op unless ENVIRONMENT is local.
    """
    if settings.ENVIRONMENT != "local":
        return 0
    if not settings.SEED_DEMO_USERS:
        return 0

    created = 0
    for email, full_name, password in DEMO_USERS:
        existing = session.exec(select(User).where(User.email == email)).first()
        if existing:
            continue
        user_in = UserCreate(
            email=email,
            password=password,
            full_name=full_name,
            is_superuser=False,
        )
        crud.create_user(session=session, user_create=user_in)
        created += 1
    return created
