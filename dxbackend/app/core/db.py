import logging

from sqlmodel import Session, SQLModel, create_engine, select

from app import crud
from app.core.config import settings
from app.core.seed_demo import seed_local_demo_users
from app.models import User, UserCreate

logger = logging.getLogger(__name__)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def init_db(session: Session) -> None:
    # Ensure tables exist without requiring Alembic (dev).
    SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            full_name="Admin",
        )
        user = crud.create_user(session=session, user_create=user_in)
    else:
        # If the user already exists (e.g., dev DB reused), ensure full_name is present
        # so the frontend can show a name instead of the raw email address.
        if user.full_name is None:
            user.full_name = "Admin"
            session.add(user)
            session.commit()

    n = seed_local_demo_users(session)
    if n:
        logger.info("Seeded %s local demo user(s) for SplitKit testing", n)
