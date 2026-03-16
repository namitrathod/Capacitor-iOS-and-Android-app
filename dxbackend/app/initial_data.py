import logging

from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine, init_db
from app.models import Item, Sale, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_dummy_data(session: Session) -> None:
    """Add dummy users, items, and sales if tables are empty."""
    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        return

    # Dummy items (products) if none exist
    existing_items = session.exec(select(Item)).first()
    if not existing_items:
        for title, desc in [
            ("Laptop", "Portable computer"),
            ("Mouse", "Wireless mouse"),
            ("Keyboard", "Mechanical keyboard"),
            ("Monitor", "27 inch display"),
            ("Headphones", "Noise cancelling"),
        ]:
            session.add(
                Item(title=title, description=desc, owner_id=user.id)
            )
        session.commit()
        logger.info("Seeded dummy items")

    # Dummy sales if none exist
    existing_sale = session.exec(select(Sale)).first()
    if not existing_sale:
        items = session.exec(select(Item).where(Item.owner_id == user.id)).all()
        if items:
            for i, item in enumerate(items[:5]):
                session.add(
                    Sale(
                        user_id=user.id,
                        product_id=item.id,
                        quantity=(i % 3) + 1,
                        price=round(99.99 * (i + 1), 2),
                    )
                )
            session.commit()
            logger.info("Seeded dummy sales")


def init() -> None:
    with Session(engine) as session:
        init_db(session)
        seed_dummy_data(session)


def main() -> None:
    logger.info("Creating initial data")
    init()
    logger.info("Initial data created")


if __name__ == "__main__":
    main()
