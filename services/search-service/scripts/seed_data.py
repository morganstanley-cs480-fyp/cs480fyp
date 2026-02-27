"""
Database seeding script for search-service.
Populates the trades table with realistic test data.

Usage:
    python -m scripts.seed_data
    make seed-data
"""

import asyncio
import sys
from datetime import datetime, timedelta
from random import choice, randint
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.connection import DatabaseManager
from app.config.settings import settings
from app.utils.logger import logger


# Sample data pools
ACCOUNTS = [f"ACC{str(i).zfill(3)}" for i in range(1, 101)]

ASSET_TYPES = ["FX", "IRS", "CDS", "EQUITY", "BOND", "COMMODITY", "CRYPTO"]

BOOKING_SYSTEMS = [
    "WINTERFELL",
    "KINGSLANDING",
    "RED KEEP",
    "HIGHGARDEN",
    "CASTERLY ROCK",
    "DRAGONSTONE",
]

AFFIRMATION_SYSTEMS = ["MARC", "BLM", "TRAI", "FIRELNK", "OMGEO"]

CLEARING_HOUSES = ["LCH", "CME", "JSCC", "OTCCHK", "EUREX", "ICE"]

STATUSES = ["ALLEGED", "CLEARED", "REJECTED", "CANCELLED"]


async def clear_existing_data(db_manager):
    """Clear existing trade data."""
    logger.info("Clearing existing trade data...")

    async with db_manager.pool.acquire() as conn:
        # Clear trades (will cascade to query_history if configured)
        await conn.execute("DELETE FROM trades")
        logger.info("Trades table cleared")


async def generate_trade(trade_id: int, base_date: datetime) -> dict:
    """Generate a single realistic trade."""
    # Random creation date in the past year
    days_ago_create = randint(0, 365)
    create_time = base_date - timedelta(days=days_ago_create)

    # Update time is after create time
    days_after_update = randint(0, max(1, days_ago_create))
    update_time = create_time + timedelta(days=days_after_update)

    return {
        "id": trade_id,
        "account": choice(ACCOUNTS),
        "asset_type": choice(ASSET_TYPES),
        "booking_system": choice(BOOKING_SYSTEMS),
        "affirmation_system": choice(AFFIRMATION_SYSTEMS),
        "clearing_house": choice(CLEARING_HOUSES),
        "create_time": create_time,
        "update_time": update_time,
        "status": choice(STATUSES),
    }


async def insert_trades(db_manager, num_trades: int = 100):
    """Insert multiple trades into database."""
    logger.info(f"Generating {num_trades} trades...")

    base_date = datetime.now()
    trades = []

    # Generate trades
    for i in range(1, num_trades + 1):
        trade_id = randint(10000000, 99999999)
        trade = await generate_trade(trade_id, base_date)
        trades.append(trade)

    logger.info(f"Inserting {len(trades)} trades into database...")

    # Batch insert
    async with db_manager.pool.acquire() as conn:
        insert_query = """
            INSERT INTO trades (
                id, account, asset_type, booking_system,
                affirmation_system, clearing_house, 
                create_time, update_time, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """

        for trade in trades:
            await conn.execute(
                insert_query,
                trade["id"],
                trade["account"],
                trade["asset_type"],
                trade["booking_system"],
                trade["affirmation_system"],
                trade["clearing_house"],
                trade["create_time"],
                trade["update_time"],
                trade["status"],
            )

    logger.info(f"Successfully inserted {len(trades)} trades")
    return trades


async def verify_data(db_manager):
    """Verify inserted data."""
    async with db_manager.pool.acquire() as conn:
        # Count total trades
        count = await conn.fetchval("SELECT COUNT(*) FROM trades")
        logger.info(f"Total trades in database: {count}")

        # Count by status
        status_counts = await conn.fetch(
            "SELECT status, COUNT(*) as count FROM trades GROUP BY status ORDER BY count DESC"
        )
        logger.info("Trade counts by status:")
        for row in status_counts:
            logger.info(f"  {row['status']}: {row['count']}")

        # Count by asset type
        asset_counts = await conn.fetch(
            "SELECT asset_type, COUNT(*) as count FROM trades GROUP BY asset_type ORDER BY count DESC"
        )
        logger.info("Trade counts by asset type:")
        for row in asset_counts:
            logger.info(f"  {row['asset_type']}: {row['count']}")


async def main():
    """Main seeding function."""
    db_manager = DatabaseManager()
    try:
        logger.info("=" * 60)
        logger.info("Starting database seeding process")
        logger.info(
            f"Database: {settings.RDS_DB} @ {settings.RDS_HOST}:{settings.RDS_PORT}"
        )
        logger.info("=" * 60)

        # Initialize database connection
        await db_manager.connect()
        logger.info("Database connection initialized")

        # Clear existing data
        await clear_existing_data(db_manager)

        # Insert new trades
        num_trades = 100  # Change this to seed more/less data
        await insert_trades(db_manager, num_trades)

        # Verify data
        await verify_data(db_manager)

        logger.info("=" * 60)
        logger.info("Database seeding completed successfully! ✅")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Error during seeding: {e}", exc_info=True)
        sys.exit(1)

    finally:
        # Clean up
        await db_manager.close()
        logger.info("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
