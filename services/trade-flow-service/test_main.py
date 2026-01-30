import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from main import app

# --- FIXTURE ---
@pytest.fixture
def mock_cursor():
    with patch("main.AsyncConnectionPool") as MockPoolClass:
        mock_pool_instance = MockPoolClass.return_value
        
        # 'open' and 'close' are awaited in lifespan, so they stay AsyncMock
        mock_pool_instance.open = AsyncMock()
        mock_pool_instance.close = AsyncMock()

        # The pool.connection() method returns an Async Context Manager
        mock_conn = AsyncMock()
        
        # Setup pool.connection() context manager
        connection_context = MagicMock()
        connection_context.__aenter__ = AsyncMock(return_value=mock_conn)
        connection_context.__aexit__ = AsyncMock(return_value=None)
        
        mock_pool_instance.connection = MagicMock(return_value=connection_context)

        # 3. Setup the Cursor (THE FIX IS HERE)
        mock_cursor = AsyncMock()
        
        cursor_context = MagicMock()
        cursor_context.__aenter__ = AsyncMock(return_value=mock_cursor)
        cursor_context.__aexit__ = AsyncMock(return_value=None)
        
        mock_conn.cursor = MagicMock(return_value=cursor_context)

        yield mock_cursor

@pytest.fixture
def client(mock_cursor):
    with TestClient(app) as c:
        yield c

# --- TESTS ---
# 1. Health Check Test
@pytest.mark.asyncio
async def test_health_check(client, mock_cursor):
    mock_cursor.fetchone.return_value = ["2024-01-01 12:00:00"]
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "time": "2024-01-01 12:00:00"}

# 2. Test successful get trade by id
@pytest.mark.asyncio
async def test_get_trade_by_id_success(client, mock_cursor):
    fake_trade = {
        "id": 10000001,
        "account": "ACC12345",
        "asset_type": "Equity",
        "booking_system": "SystemA",
        "affirmation_system": "AffirmX",
        "clearing_house": "ClearHouseY",
        "create_time": "2025-01-15T10:00:00",
        "update_time": "2025-08-20T14:30:00",
        "status": "Cleared"
    }
    mock_cursor.fetchone.return_value = fake_trade
    
    response = client.get("/trades/10000001")
    assert response.status_code == 200
    assert response.json() == fake_trade

# 3. Test missing trade by trade id
@pytest.mark.asyncio
async def test_get_trade_by_id_404(client, mock_cursor):
    mock_cursor.fetchone.return_value = None
    response = client.get("/trades/99999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trade 99999999 not found"

# 4. Test get all trades
@pytest.mark.asyncio
async def test_get_trades_list(client, mock_cursor):
    fake_trades = [
        { "id": 10000001,
        "account": "ACC12345",
        "asset_type": "Equity",
        "booking_system": "SystemA",
        "affirmation_system": "AffirmX",
        "clearing_house": "ClearHouseY",
        "create_time": "2025-01-15T10:00:00",
        "update_time": "2025-08-20T14:30:00",
        "status": "Cleared"},
        { "id": 10000002,
        "account": "ACC12346",
        "asset_type": "Equity",
        "booking_system": "SystemB",
        "affirmation_system": "MIG",
        "clearing_house": "ClearHouseX",
        "create_time": "2025-01-15T13:00:00",
        "update_time": "2025-08-20T16:30:00",
        "status": "Failed"}
    ]
    mock_cursor.fetchall.return_value = fake_trades
    
    response = client.get("/trades?limit=10&offset=0")
    assert response.status_code == 200
    assert len(response.json()) == 2

# 5. Test get transaction by id
@pytest.mark.asyncio
async def test_get_transaction_by_id(client, mock_cursor):
    fake_trans = {
        "id": 50000001,
        "trade_id": 10000001,
        "create_time": "2025-01-15T10:05:00",
        "entity": "Bank_A",
        "direction": "BUY",
        "type": "New",
        "status": "Pending",
        "update_time": "2025-08-20T14:35:00",
        "step": 1
    }
    mock_cursor.fetchone.return_value = fake_trans
    
    response = client.get("/transactions/50000001")
    assert response.status_code == 200
    assert response.json() == fake_trans

# 6. Test get transactions by trade id
@pytest.mark.asyncio
async def test_get_transactions_by_trade_id(client, mock_cursor):
    fake_history = [
       {
        "id": 50000001,
        "trade_id": 10000001,
        "create_time": "2025-01-15T10:05:00",
        "entity": "Bank_A",
        "direction": "BUY",
        "type": "New",
        "status": "Pending",
        "update_time": "2025-08-20T14:35:00",
        "step": 1
      },
      {
          "id": 50000002,
          "trade_id": 10000001,
          "create_time": "2025-02-28T09:30:00",
          "entity": "Client_X",
          "direction": "SELL",
          "type": "Allocation",
          "status": "Cleared",
          "update_time": "2025-09-05T16:00:00",
          "step": 2
      }
    ]
    mock_cursor.fetchall.return_value = fake_history
    
    response = client.get("/trades/10000001/transactions")
    assert response.status_code == 200
    assert len(response.json()) == 2

# 7. Test DB connection failure
@pytest.mark.asyncio
async def test_db_failure(client, mock_cursor):
    mock_cursor.execute.side_effect = Exception("DB Connection Lost")
    
    response = client.get("/trades/10000001")
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Server Error"