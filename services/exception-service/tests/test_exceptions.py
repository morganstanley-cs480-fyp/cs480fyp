import pytest
from httpx import AsyncClient
from app.models import Exception

@pytest.mark.asyncio
async def test_create_exception(client: AsyncClient):
    """Test creating a new exception"""
    payload = {
        "trade_id": 1234,
        "trans_id": 56789,
        "msg": "New exception",
        "priority": "High",
        "status": "Pending",
        "comment": "Test comment"
    }
    response = await client.post("/exceptions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["trade_id"] == 1234
    assert data["trans_id"] == 56789
    assert data["msg"] == "New exception"
    assert data["priority"] == "High"
    assert data["status"] == "Pending"
    assert "id" in data
    assert "create_time" in data
    
    # Cleanup
    await Exception.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_create_exception_without_comment(client: AsyncClient):
    """Test creating exception without optional comment"""
    payload = {
        "trade_id": 1234,
        "trans_id": 56789,
        "msg": "Exception without comment",
        "priority": "Low",
        "status": "Pending"
    }
    response = await client.post("/exceptions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["comment"] is None
    
    # Cleanup
    await Exception.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_get_exception(client: AsyncClient, sample_exception):
    """Test retrieving a single exception"""
    response = await client.get(f"/exceptions/{sample_exception.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_exception.id
    assert data["trade_id"] == 1234
    assert data["msg"] == "Test exception message"

@pytest.mark.asyncio
async def test_get_exception_not_found(client: AsyncClient):
    """Test retrieving non-existent exception returns 404"""
    response = await client.get("/exceptions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Exception not found"

@pytest.mark.asyncio
async def test_list_exceptions(client: AsyncClient, multiple_exceptions):
    """Test listing all exceptions"""
    response = await client.get("/exceptions/")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5

@pytest.mark.asyncio
async def test_update_exception(client: AsyncClient, sample_exception):
    """Test updating an exception"""
    payload = {
        "msg": "Updated message",
        "priority": "Critical",
        "status": "Closed"
    }
    response = await client.put(f"/exceptions/{sample_exception.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["msg"] == "Updated message"
    assert data["priority"] == "Critical"
    assert data["status"] == "Closed"

@pytest.mark.asyncio
async def test_update_exception_partial(client: AsyncClient, sample_exception):
    """Test partial update of exception"""
    original_msg = sample_exception.msg
    payload = {"priority": "Low"}
    
    response = await client.put(f"/exceptions/{sample_exception.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["priority"] == "Low"
    assert data["msg"] == original_msg  # Should remain unchanged

@pytest.mark.asyncio
async def test_update_exception_not_found(client: AsyncClient):
    """Test updating non-existent exception returns 404"""
    payload = {"priority": "High"}
    response = await client.put("/exceptions/99999", json=payload)
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Exception not found"

@pytest.mark.asyncio
async def test_delete_exception(client: AsyncClient):
    """Test deleting an exception"""
    # Create exception to delete
    exception = await Exception.create(
        trade_id=9999,
        trans_id=99999,
        msg="To be deleted",
        priority="Low",
        status="Pending"
    )
    
    response = await client.delete(f"/exceptions/{exception.id}")
    assert response.status_code == 204
    
    # Verify deletion
    deleted = await Exception.get_or_none(id=exception.id)
    assert deleted is None

@pytest.mark.asyncio
async def test_delete_exception_not_found(client: AsyncClient):
    """Test deleting non-existent exception returns 404"""
    response = await client.delete("/exceptions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Exception not found"