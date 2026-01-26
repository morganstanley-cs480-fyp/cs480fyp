import pytest
from app.models import Solution

@pytest.mark.asyncio
async def test_create_solution_model():
    """Test creating solution via model"""
    solution = await Solution.create(
        exception_id=1,
        title="Model test solution",
        exception_description="Test exception description",
        solution_description="Test solution description",
        scores=10
    )
    
    assert solution.id is not None
    assert solution.exception_id == 1
    assert solution.title == "Model test solution"
    assert solution.scores == 10
    assert solution.create_time is not None
    
    await solution.delete()

@pytest.mark.asyncio
async def test_solution_score_validation():
    """Test that scores are within valid range (0-27)"""
    # Test minimum score
    solution_min = await Solution.create(
        exception_id=2,
        title="Minimum score test",
        scores=0
    )
    assert solution_min.scores == 0
    await solution_min.delete()
    
    # Test maximum score
    solution_max = await Solution.create(
        exception_id=3,
        title="Maximum score test",
        scores=27
    )
    assert solution_max.scores == 27
    await solution_max.delete()

@pytest.mark.asyncio
async def test_solution_update():
    """Test updating solution model"""
    solution = await Solution.create(
        exception_id=4,
        title="Original title",
        scores=10
    )
    
    solution.title = "Updated title"
    solution.scores = 20
    solution.solution_description = "Added solution description"
    await solution.save()
    
    # Fetch again to verify
    updated = await Solution.get(id=solution.id)
    assert updated.title == "Updated title"
    assert updated.scores == 20
    assert updated.solution_description == "Added solution description"
    
    await solution.delete()

@pytest.mark.asyncio
async def test_solution_optional_fields():
    """Test creating solution with only required fields"""
    solution = await Solution.create(
        exception_id=5,
        title="Minimal solution",
        scores=5
    )
    
    assert solution.exception_description is None
    assert solution.reference_event is None
    assert solution.solution_description is None
    
    await solution.delete()