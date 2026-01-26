import pytest
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise
from main import app
from app.models import Solution

@pytest.fixture(scope="session", autouse=True)
async def initialize_db():
    """Initialize test database"""
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": ["app.models"]}
    )
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
async def sample_solution():
    """Create a sample solution for testing"""
    solution = await Solution.create(
        exception_id=1,
        title="Test solution title",
        exception_description="Test exception description",
        reference_event="Test reference event",
        solution_description="Test solution description",
        scores=15
    )
    yield solution
    # Cleanup
    await solution.delete()

@pytest.fixture
async def multiple_solutions():
    """Create multiple solutions for testing"""
    solutions = []
    for i in range(5):
        solution = await Solution.create(
            exception_id=100 + i,
            title=f"Test solution {i}",
            exception_description=f"Exception description {i}" if i % 2 == 0 else None,
            reference_event=f"Reference event {i}" if i % 3 == 0 else None,
            solution_description=f"Solution description {i}" if i % 2 == 0 else None,
            scores=i * 5  # 0, 5, 10, 15, 20
        )
        solutions.append(solution)
    yield solutions
    # Cleanup
    for solution in solutions:
        await solution.delete()