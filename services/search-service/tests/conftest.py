"""
Pytest configuration and fixtures for LocalStack integration testing.
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import AsyncGenerator

import pytest
from redis import Redis
import asyncpg

# Load test environment variables BEFORE importing app modules
test_env_file = Path(__file__).parent.parent / ".env.test"
if test_env_file.exists():
    with open(test_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.connection import db_manager  # noqa: E402
from app.cache.redis_client import redis_manager  # noqa: E402


def pytest_configure(config):
    """Set testing mode"""
    os.environ["TESTING"] = "true"


# Database Fixtures


@pytest.fixture(scope="function")
async def db_connection() -> AsyncGenerator[asyncpg.Pool, None]:
    """PostgreSQL connection pool for tests."""
    await db_manager.connect()
    yield db_manager.pool
    await db_manager.disconnect()


@pytest.fixture(scope="function")
async def db_transaction(
    db_connection: asyncpg.Pool,
) -> AsyncGenerator[asyncpg.Connection, None]:
    """Database transaction that auto-rolls back after test"""
    async with db_connection.acquire() as conn:
        async with conn.transaction():
            yield conn


@pytest.fixture(scope="function")
async def clean_db(db_connection: asyncpg.Pool):
    """Truncate test tables before test"""
    async with db_connection.acquire() as conn:
        await conn.execute("TRUNCATE TABLE IF EXISTS query_history CASCADE")
    yield


# Redis Fixtures


@pytest.fixture(scope="function")
async def redis_connection() -> AsyncGenerator[Redis, None]:
    """Redis client for tests"""
    await redis_manager.connect()
    yield redis_manager.client
    await redis_manager.disconnect()


@pytest.fixture(scope="function")
async def clean_redis(redis_connection: Redis):
    """Flush Redis before and after test"""
    await redis_manager.client.flushdb()
    yield
    await redis_manager.client.flushdb()


# AWS LocalStack Fixtures (for future AWS integration tests)


@pytest.fixture(scope="session")
def aws_credentials():
    """LocalStack dummy credentials."""
    os.environ["AWS_ACCESS_KEY_ID"] = "test"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "test"
    os.environ["AWS_REGION"] = "us-east-1"


@pytest.fixture(scope="session")
def localstack_endpoint():
    """LocalStack endpoint URL."""
    return os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")


@pytest.fixture(scope="function")
def mock_bedrock_response():
    """Generate mock Bedrock AI responses"""

    def _create_response(
        extracted_query: str = "SELECT * FROM trades", confidence: float = 0.95
    ):
        return {
            "extracted_query": extracted_query,
            "confidence": confidence,
            "query_type": "trade_search",
            "filters": {},
        }

    return _create_response


# Test Data Fixtures


@pytest.fixture(scope="function")
def sample_trade_data():
    """Sample trade record"""
    return {
        "trade_id": 10001234,
        "account": "ACC12345",
        "asset_type": "FX",
        "booking_system": "HIGHGARDEN",
        "affirmation_system": "TRAI",
        "clearing_house": "DTCC",
        "create_time": "2026-01-27 09:30:00",
        "update_time": "2026-01-27 10:00:00",
        "status": "CLEARED",
    }


@pytest.fixture(scope="function")
def sample_search_query():
    """Sample search query"""
    return {
        "query": "Show me all FX trades for ACC12345",
        "filters": {"asset_type": "FX", "account": "ACC12345"},
        "limit": 50,
    }


# Utility Fixtures


@pytest.fixture(scope="function")
async def wait_for_services():
    """Wait for DB and Redis to be ready (with retry logic)"""
    max_retries = 30
    retry_delay = 1

    for i in range(max_retries):
        try:
            await db_manager.connect()
            break
        except Exception:
            if i == max_retries - 1:
                raise
            await asyncio.sleep(retry_delay)

    for i in range(max_retries):
        try:
            await redis_manager.connect()
            break
        except Exception:
            if i == max_retries - 1:
                raise
            await asyncio.sleep(retry_delay)

    yield

    await db_manager.disconnect()
    await redis_manager.disconnect()
