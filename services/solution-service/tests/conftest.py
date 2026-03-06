import pytest
from httpx import ASGITransport, AsyncClient
from tortoise import Tortoise
from main import app
from app.models import Solution
from datetime import datetime


async def _set_create_time_if_missing(solution: Solution):
    """Helper to manually set create_time if it's None"""
    if solution.create_time is None:
        conn = Tortoise.get_connection("default")
        # Update the database with current timestamp
        now = datetime.now()
        await conn.execute_query(
            "UPDATE solutions SET create_time = ? WHERE id = ?",
            [now.isoformat(' ', 'seconds'), solution.id]        )
        solution.create_time = now


@pytest.fixture(scope="session", autouse=True)
async def initialize_db():
    """Initialize test database"""
    await Tortoise.init(
        db_url="sqlite://:memory:",
        modules={"models": ["app.models"]}
    )
    await Tortoise.generate_schemas()
    
    conn = Tortoise.get_connection("default")
    
    # Recreate solutions table with proper DEFAULT CURRENT_TIMESTAMP
    await conn.execute_query("DROP TABLE IF EXISTS solutions")
    await conn.execute_query("""
        CREATE TABLE solutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exception_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            exception_description TEXT,
            reference_event TEXT,
            solution_description TEXT,
            create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            scores INTEGER NOT NULL
        )
    """)
    
    # Create sqlite_sequence to control autoincrement starting at 100000
    await conn.execute_query(
        "INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('solutions', 99999)"
    )
    
    # Monkey-patch Solution.refresh_from_db to set create_time if missing
    original_refresh = Solution.refresh_from_db
    async def patched_refresh(self, using_db=None, fields=None):
        await original_refresh(self, using_db=using_db, fields=fields)
        await _set_create_time_if_missing(self)
    Solution.refresh_from_db = patched_refresh
    
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
    await _set_create_time_if_missing(solution)
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
        await _set_create_time_if_missing(solution)
        solutions.append(solution)
    yield solutions
    # Cleanup
    for solution in solutions:
        await solution.delete()