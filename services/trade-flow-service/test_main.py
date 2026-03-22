import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

os.environ["NEPTUNE_ENDPOINT"] = "bolt://dummy-host:8182"
os.environ["DB_HOST"] = "localhost"
os.environ["DB_NAME"] = "testdb"
os.environ["DB_USER"] = "testuser"
os.environ["DB_PASSWORD"] = "testpass"

from main import app

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
def mock_neptune():
    # We use create=True so this doesn't crash if you run it against 
    # the older version of main.py that didn't import GraphDatabase yet.
    with patch("main.GraphDatabase", create=True) as MockGraphDB:
        mock_driver_instance = MagicMock()
        MockGraphDB.driver.return_value = mock_driver_instance
        
        # Lifespan methods
        mock_driver_instance.verify_connectivity = MagicMock()
        mock_driver_instance.close = MagicMock()
        
        # Session context manager (sync)
        mock_session = MagicMock()
        mock_driver_instance.session.return_value.__enter__.return_value = mock_session
        
        yield mock_session

@pytest.fixture
def client(mock_cursor):
    with TestClient(app) as c:
        yield c

# --- TESTS ---
# 1. Health Check Test
@pytest.mark.asyncio
async def test_health_check(client, mock_cursor):
    # The mock returns a list, which psycopg normally unpacks
    mock_cursor.fetchone.return_value = ["2024-01-01 12:00:00"]
    
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    # Check for specific keys so the test doesn't break when we add new features
    assert data["status"] == "ok"
    assert "postgres_time" in data
    assert "neptune_status" in data

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
        "status": "CLEARED"
    }
    mock_cursor.fetchone.return_value = fake_trade
    
    response = client.get("/api/trades/10000001")
    assert response.status_code == 200
    assert response.json() == fake_trade

# 3. Test missing trade by trade id
@pytest.mark.asyncio
async def test_get_trade_by_id_404(client, mock_cursor):
    mock_cursor.fetchone.return_value = None
    response = client.get("/api/trades/99999999")
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
        "status": "CLEARED"},
        { "id": 10000002,
        "account": "ACC12346",
        "asset_type": "Equity",
        "booking_system": "SystemB",
        "affirmation_system": "MIG",
        "clearing_house": "ClearHouseX",
        "create_time": "2025-01-15T13:00:00",
        "update_time": "2025-08-20T16:30:00",
        "status": "REJECTED"}
    ]
    
    # NEW: Mock the total count query (fetchone)
    mock_cursor.fetchone.return_value = {"count": 2}
    # Mock the data query (fetchall)
    mock_cursor.fetchall.return_value = fake_trades
    
    response = client.get("/api/trades?limit=10&offset=0")
    assert response.status_code == 200
    
    # NEW: Assert against the "data" key, not the whole JSON object
    data = response.json()
    assert len(data["data"]) == 2
    assert data["total"] == 2

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
        "status": "ALLEGED",
        "update_time": "2025-08-20T14:35:00",
        "step": 1
    }
    mock_cursor.fetchone.return_value = fake_trans
    
    response = client.get("/api/transactions/50000001")
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
        "status": "ALLEGED",
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
          "status": "CLEARED",
          "update_time": "2025-09-05T16:00:00",
          "step": 2
      }
    ]
    mock_cursor.fetchall.return_value = fake_history
    
    response = client.get("/api/trades/10000001/transactions")
    assert response.status_code == 200
    assert len(response.json()) == 2

# 7. Test DB connection failure
@pytest.mark.asyncio
async def test_db_failure(client, mock_cursor):
    mock_cursor.execute.side_effect = Exception("DB Connection Lost")
    
    response = client.get("/api/trades/10000001")
    
    assert response.status_code == 500
    assert response.json()["detail"] == "Server Error"
    
@pytest.mark.asyncio
async def test_get_trade_graph_success(client, mock_neptune):
    # Mock the Neo4j Record structure returned by session.run().single()
    mock_record = MagicMock()
    
    # Mocking the primary trade node parsing
    mock_trade_node = MagicMock()
    mock_trade_node.items.return_value = {"id": "1000502", "status": "REJECTED"}.items()
    
    # We use side_effect to return our mocked trade node, and empty lists for the rest
    mock_record.get.side_effect = lambda key: {
        't': mock_trade_node,
        'metadata': [],
        'transactions': [],
        'counterparties': [],
        'exceptions': []
    }.get(key)
    
    mock_result = MagicMock()
    mock_result.single.return_value = mock_record
    mock_neptune.run.return_value = mock_result
    
    response = client.get("/api/trades/1000502/graph")
    
    assert response.status_code == 200
    assert response.json()["trade"]["id"] == "1000502"
    assert response.json()["trade"]["status"] == "REJECTED"

@pytest.mark.asyncio
async def test_get_graph_overview(client, mock_neptune):
    # Mock an iterable result (list of records) returned by session.run()
    mock_record = MagicMock()
    
    mock_node = MagicMock()
    mock_node.element_id = "node-abc-123"
    mock_node.labels = ["Trade"]
    mock_node.items.return_value = {"id": "1000502", "account": "ACC123"}.items()
    
    # Mock the row returning just one Trade node, no relationships for simplicity
    mock_record.get.side_effect = lambda key: {
        't': mock_node, 'n1': None, 'n2': None, 'r1': None, 'r2': None
    }.get(key)
    
    # run() returns an iterable of rows 
    mock_neptune.run.return_value = [mock_record]
    
    response = client.get("/api/graph/overview?limit=10&status=REJECTED")
    
    assert response.status_code == 200
    json_data = response.json()
    assert len(json_data["nodes"]) == 1
    assert json_data["nodes"][0]["id"] == "node-abc-123"