from faker import Faker
import asyncio
from tortoise import Tortoise
from app.config import settings
from app.models import Exception
from app.models.exception import ExceptionStatus
import random

fake = Faker()


async def init_db():
    await Tortoise.init(
        db_url=settings.DATABASE_URL, modules={"models": ["app.models"]}
    )
    await Tortoise.generate_schemas()


async def seed_exceptions(count: int = 50):
    """Generate and insert mock exception data"""
    print(f"Seeding {count} exceptions...")

    for _ in range(count):
        await Exception.create(
            trade_id=fake.random_int(min=1000, max=9999),
            trans_id=fake.random_int(min=10000, max=99999),
            status=random.choice(list(ExceptionStatus)),
            msg=fake.sentence(nb_words=10),
            comment=fake.text(max_nb_chars=200)
            if random.choice([True, False])
            else None,
            priority=random.choice(["Low", "Medium", "High", "Critical"]),
        )

    print(f"Successfully seeded {count} exceptions!")


async def main():
    await init_db()
    await seed_exceptions(50)
    await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(main())
