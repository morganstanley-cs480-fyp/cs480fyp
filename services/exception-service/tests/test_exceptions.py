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
        "status": "PENDING",
        "comment": "Test comment"
    }
    response = await client.post("/api/exceptions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["trade_id"] == 1234
    assert data["trans_id"] == 56789
    assert data["msg"] == "New exception"
    assert data["priority"] == "High"
    assert data["status"] == "PENDING"
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
        "status": "PENDING"
    }
    response = await client.post("/api/exceptions/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["comment"] is None
    
    # Cleanup
    await Exception.filter(id=data["id"]).delete()

@pytest.mark.asyncio
async def test_get_exception(client: AsyncClient, sample_exception):
    """Test retrieving a single exception"""
    response = await client.get(f"/api/exceptions/{sample_exception.id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == sample_exception.id
    assert data["trade_id"] == 1234
    assert data["msg"] == "Test exception message"

@pytest.mark.asyncio
async def test_get_exception_not_found(client: AsyncClient):
    """Test retrieving non-existent exception returns 404"""
    response = await client.get("/api/exceptions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Exception not found"

@pytest.mark.asyncio
async def test_list_exceptions(client: AsyncClient, multiple_exceptions):
    """Test listing all exceptions"""
    response = await client.get("/api/exceptions/")
    
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
        "status": "CLOSED"
    }
    response = await client.put(f"/api/exceptions/{sample_exception.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["msg"] == "Updated message"
    assert data["priority"] == "Critical"
    assert data["status"] == "CLOSED"

@pytest.mark.asyncio
async def test_update_exception_partial(client: AsyncClient, sample_exception):
    """Test partial update of exception"""
    original_msg = sample_exception.msg
    payload = {"priority": "Low"}
    
    response = await client.put(f"/api/exceptions/{sample_exception.id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["priority"] == "Low"
    assert data["msg"] == original_msg  # Should remain unchanged

@pytest.mark.asyncio
async def test_update_exception_not_found(client: AsyncClient):
    """Test updating non-existent exception returns 404"""
    payload = {"priority": "High"}
    response = await client.put("/api/exceptions/99999", json=payload)
    
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
        status="PENDING"
    )
    
    response = await client.delete(f"/api/exceptions/{exception.id}")
    assert response.status_code == 204
    
    # Verify deletion
    deleted = await Exception.get_or_none(id=exception.id)
    assert deleted is None

@pytest.mark.asyncio
async def test_delete_exception_not_found(client: AsyncClient):
    """Test deleting non-existent exception returns 404"""
    response = await client.delete("/api/exceptions/99999")
    
    assert response.status_code == 404
    assert response.json()["detail"] == "Exception not found"

@pytest.mark.asyncio
async def test_get_exceptions_by_trade(client: AsyncClient):
    """Test retrieving all exceptions for a specific trade"""
    # Create multiple exceptions with the same trade_id
    trade_id = 5555
    exceptions = []
    for i in range(3):
        exception = await Exception.create(
            trade_id=trade_id,
            trans_id=20000 + i,
            msg=f"Exception {i} for trade {trade_id}",
            priority=["Low", "Medium", "High"][i],
            status="PENDING"
        )
        exceptions.append(exception)
    
    # Create an exception with different trade_id
    other_exception = await Exception.create(
        trade_id=6666,
        trans_id=30000,
        msg="Different trade exception",
        priority="Low",
        status="PENDING"
    )
    
    response = await client.get(f"/api/exceptions/trade/{trade_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3
    
    # Verify all returned exceptions have the correct trade_id
    for exc in data:
        assert exc["trade_id"] == trade_id
    
    # Verify trans_ids match
    trans_ids = [exc["trans_id"] for exc in data]
    assert set(trans_ids) == {20000, 20001, 20002}
    
    # Cleanup
    for exception in exceptions:
        await exception.delete()
    await other_exception.delete()

@pytest.mark.asyncio
async def test_get_exceptions_by_trade_empty(client: AsyncClient):
    """Test retrieving exceptions for a trade with no exceptions returns empty list"""
    response = await client.get("/api/exceptions/trade/99999")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0

@pytest.mark.asyncio
async def test_get_exceptions_by_trade_with_sample(client: AsyncClient, sample_exception):
    """Test retrieving exceptions using the sample_exception fixture"""
    response = await client.get(f"/api/exceptions/trade/{sample_exception.trade_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Find our sample exception in the results
    found = any(exc["id"] == sample_exception.id for exc in data)
    assert found