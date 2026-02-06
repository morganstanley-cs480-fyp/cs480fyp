"""
Database connection checker script.
Verifies connection to PostgreSQL and Redis.

Usage:
    python -m scripts.check_db
    make check-db
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.connection import DatabaseManager
from app.cache.redis_client import RedisManager
from app.config.settings import settings
from app.utils.logger import logger


async def check_database():
    """Check PostgreSQL connection."""
    db_manager = DatabaseManager()
    try:
        logger.info(f"Checking database connection to {settings.RDS_HOST}:{settings.RDS_PORT}...")
        
        await db_manager.connect()
        
        async with db_manager.pool.acquire() as conn:
            # Test query
            version = await conn.fetchval("SELECT version()")
            logger.info(f"✅ Database connected: {version[:50]}...")
            
            # Check trades table
            count = await conn.fetchval("SELECT COUNT(*) FROM trades")
            logger.info(f"✅ Trades table accessible: {count} records")
            
            # Check query_history table
            history_count = await conn.fetchval("SELECT COUNT(*) FROM query_history")
            logger.info(f"✅ Query history table accessible: {history_count} records")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False
    finally:
        await db_manager.close()


async def check_redis():
    """Check Redis connection."""
    redis_manager = RedisManager()
    try:
        logger.info(f"Checking Redis connection to {settings.REDIS_HOST}:{settings.REDIS_PORT}...")
        
        await redis_manager.connect()
        
        # Test ping
        await redis_manager.client.ping()
        logger.info("✅ Redis connected and responding to PING")
        
        # Test set/get
        test_key = "health_check_test"
        await redis_manager.client.set(test_key, "test_value", ex=10)
        value = await redis_manager.client.get(test_key)
        
        if value == "test_value":
            logger.info("✅ Redis read/write operations working")
        else:
            logger.warning("⚠️ Redis read/write test failed")
        
        # Clean up test key
        await redis_manager.client.delete(test_key)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        return False
    finally:
        await redis_manager.close()


async def main():
    """Main check function."""
    logger.info("=" * 60)
    logger.info("Database & Cache Connection Check")
    logger.info("=" * 60)
    
    db_ok = await check_database()
    redis_ok = await check_redis()
    
    logger.info("=" * 60)
    if db_ok and redis_ok:
        logger.info("✅ All connections successful!")
        logger.info("=" * 60)
        sys.exit(0)
    else:
        logger.error("❌ Some connections failed")
        logger.info("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
