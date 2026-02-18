from faker import Faker
import asyncio
from tortoise import Tortoise
from app.config import settings
from app.models import Solution
import random

fake = Faker()

async def init_db():
    await Tortoise.init(
        db_url=settings.DATABASE_URL,
        modules={"models": ["app.models"]}
    )
    await Tortoise.generate_schemas()

async def seed_solutions(count: int = 50):
    """Generate and insert mock solution data"""
    print(f"Seeding {count} solutions...")
    
    for _ in range(count):
        await Solution.create(
            exception_id=fake.random_int(min=1, max=100),
            title=fake.sentence(nb_words=6),
            exception_description=fake.text(max_nb_chars=200) if random.choice([True, False]) else None,
            reference_event=fake.text(max_nb_chars=150) if random.choice([True, False]) else None,
            solution_description=fake.text(max_nb_chars=300) if random.choice([True, False]) else None,
            scores=fake.random_int(min=0, max=27),
        )
    
    print(f"Successfully seeded {count} solutions!")

async def main():
    await init_db()
    await seed_solutions(50)
    await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(main())