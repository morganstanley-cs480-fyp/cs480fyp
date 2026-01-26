import pytest
from httpx import AsyncClient
from app.models import Solution

@pytest.mark.asyncio
async def test_create_solution(client: AsyncClient):
    """Test creating a new solution"""
    payload = {
        "exception_id": 1,
        "title": "New solution",
        "exception_description": "Test exception description",
        "reference_event": "Reference event",
        "solution_description": "Solution description",
        "scores": 15
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["exception_id"] == 1
    assert data["title"] == "New solution"
    assert data["scores"] == 15
    assert "id" in data
    assert "create_time" in data
    
    # Cleanup
    await Solution.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_create_solution_minimal_fields(client: AsyncClient):
    """Test creating solution with only required fields"""
    payload = {
        "exception_id": 2,
        "title": "Minimal solution",
        "scores": 10
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["exception_description"] is None
    assert data["reference_event"] is None
    assert data["solution_description"] is None
    
    # Cleanup
    await Solution.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_create_solution_with_minimum_score(client: AsyncClient):
    """Test creating solution with minimum score (0)"""
    payload = {
        "exception_id": 3,
        "title": "Minimum score solution",
        "scores": 0
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["scores"] == 0
    
    # Cleanup
    await Solution.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_create_solution_with_maximum_score(client: AsyncClient):
    """Test creating solution with maximum score (27)"""
    payload = {
        "exception_id": 4,
        "title": "Maximum score solution",
        "scores": 27
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["scores"] == 27
    
    # Cleanup
    await Solution.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_create_solution_invalid_score_too_high(client: AsyncClient):
    """Test creating solution with score > 27 should fail"""
    payload = {
        "exception_id": 5,
        "title": "Invalid high score",
        "scores": 30
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_create_solution_invalid_score_negative(client: AsyncClient):
    """Test creating solution with negative score should fail"""
    payload = {
        "exception_id": 6,
        "title": "Invalid negative score",
        "scores": -5
    }
    response = await client.post("/solutions/", json=payload)
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_get_solution(client: AsyncClient, sample_solution):
    """Test retrieving a single solution"""
    response = await client.get(f"/solutions/{sample_solution.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_solution.id
    assert data["exception_id"] == 1
    assert data["title"] == "Test solution title"
    assert data["scores"] == 15

@pytest.mark.asyncio
async def test_get_solution_not_found(client: AsyncClient):
    """Test retrieving non-existent solution returns 404"""
    response = await client.get("/solutions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Solution not found"

@pytest.mark.asyncio
async def test_list_solutions(client: AsyncClient, multiple_solutions):
    """Test listing all solutions"""
    response = await client.get("/solutions/")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5

@pytest.mark.asyncio
async def test_update_solution(client: AsyncClient, sample_solution):
    """Test updating a solution"""
    payload = {
        "title": "Updated title",
        "scores": 20,
        "solution_description": "Updated description"
    }
    response = await client.put(f"/solutions/{sample_solution.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated title"
    assert data["scores"] == 20
    assert data["solution_description"] == "Updated description"

@pytest.mark.asyncio
async def test_update_solution_partial(client: AsyncClient, sample_solution):
    """Test partial update of solution"""
    original_title = sample_solution.title
    payload = {"scores": 25}
    
    response = await client.put(f"/solutions/{sample_solution.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["scores"] == 25
    assert data["title"] == original_title  # Should remain unchanged

@pytest.mark.asyncio
async def test_update_solution_invalid_score(client: AsyncClient, sample_solution):
    """Test updating solution with invalid score should fail"""
    payload = {"scores": 100}
    response = await client.put(f"/solutions/{sample_solution.id}", json=payload)
    
    assert response.status_code == 422  # Validation error

@pytest.mark.asyncio
async def test_update_solution_not_found(client: AsyncClient):
    """Test updating non-existent solution returns 404"""
    payload = {"scores": 15}
    response = await client.put("/solutions/99999", json=payload)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Solution not found"

@pytest.mark.asyncio
async def test_delete_solution(client: AsyncClient):
    """Test deleting a solution"""
    # Create solution to delete
    solution = await Solution.create(
        exception_id=999,
        title="To be deleted",
        scores=10
    )
    
    response = await client.delete(f"/solutions/{solution.id}")
    assert response.status_code == 204
    
    # Verify deletion
    deleted = await Solution.get_or_none(id=solution.id)
    assert deleted is None

@pytest.mark.asyncio
async def test_delete_solution_not_found(client: AsyncClient):
    """Test deleting non-existent solution returns 404"""
    response = await client.delete("/solutions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Solution not found"
