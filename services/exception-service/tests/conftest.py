import pytest
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise
from main import app
from app.models import Exception


@pytest.fixture(scope="session", autouse=True)
async def initialize_db():
    """Initialize test database"""
    await Tortoise.init(db_url="sqlite://:memory:", modules={"models": ["app.models"]})
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()


@pytest.fixture
async def client():
    """Create test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def sample_exception():
    """Create a sample exception for testing"""
    exception = await Exception.create(
        trade_id=1234,
        trans_id=56789,
        msg="Test exception message",
        priority="High",
        status="PENDING",
        comment="Test comment",
    )
    yield exception
    # Cleanup
    await exception.delete()


@pytest.fixture
async def multiple_exceptions():
    """Create multiple exceptions for testing"""
    exceptions = []
    for i in range(5):
        exception = await Exception.create(
            trade_id=1000 + i,
            trans_id=10000 + i,
            msg=f"Test message {i}",
            priority=["Low", "Medium", "High", "Critical"][i % 4],
            status="PENDING" if i % 2 == 0 else "CLOSED",
            comment=f"Comment {i}" if i % 2 == 0 else None,
        )
        exceptions.append(exception)
    yield exceptions
    # Cleanup
    for exception in exceptions:
        await exception.delete()
