import os
import contextlib
from typing import Optional
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from neo4j import GraphDatabase

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")
DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
NEPTUNE_ENDPOINT = os.getenv("NEPTUNE_ENDPOINT")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize Postgres Pool
    app.state.pool = AsyncConnectionPool(
        conninfo=DATABASE_URL,
        min_size=1,
        max_size=20,
        kwargs={"autocommit": True}
    )
    await app.state.pool.open()
    print("Connected to PostgreSQL Database")

    # 2. Initialize Neptune Driver
    try:
        app.state.neptune_driver = GraphDatabase.driver(
            NEPTUNE_ENDPOINT, 
            auth=None # Neptune usually doesn't require auth unless IAM is specifically enabled
        )
        # Verify connectivity
        app.state.neptune_driver.verify_connectivity()
        print(f"Connected to Neptune at {NEPTUNE_ENDPOINT}")
    except Exception as e:
        print(f"Warning: Could not connect to Neptune: {e}")
        app.state.neptune_driver = None

    yield 

    # 3. Teardown
    await app.state.pool.close()
    print("PostgreSQL connection closed")
    
    if app.state.neptune_driver:
        app.state.neptune_driver.close()
        print("Neptune connection closed")


# redirect_slashes=False prevents http:// redirects through CloudFront/ALB.
app = FastAPI(lifespan=lifespan, redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health_check():
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT NOW()")
                result = await cur.fetchone()
                
                # Check Neptune status as well
                neptune_status = "ok" if app.state.neptune_driver else "disconnected"
                
                return {
                    "status": "ok", 
                    "postgres_time": result,
                    "neptune_status": neptune_status
                }
    except Exception as e:
        print(f"DB Error: {e}")
        raise HTTPException(status_code=500,
                            detail="Database connection failed")

api_router = APIRouter(prefix="/api")

class TradeFilterParams(BaseModel):
    limit: int = 100
    offset: int = 0
    account: Optional[str] = None
    asset_type: Optional[str] = None
    booking_system: Optional[str] = None
    affirmation_system: Optional[str] = None
    clearing_house: Optional[str] = None
    status: Optional[str] = None
    create_time_from: Optional[str] = None
    create_time_to: Optional[str] = None
    update_time_from: Optional[str] = None
    update_time_to: Optional[str] = None
    sort_by: str = "update_time"
    sort_order: str = "desc"

@api_router.get("/trades")
async def get_trades(filters: TradeFilterParams = Depends()):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                
                # 1. Start building the query
                base_query = "FROM trades"
                conditions = []
                params = []

                # 2. Dynamic Equality Filters
                # Mapping (Database Column Name, Filter Value)
                equal_filters = [
                    ("account", filters.account),
                    ("asset_type", filters.asset_type),
                    ("booking_system", filters.booking_system),
                    ("affirmation_system", filters.affirmation_system),
                    ("clearing_house", filters.clearing_house),
                    ("status", filters.status),
                ]

                for col, val in equal_filters:
                    if val is not None:
                        conditions.append(f"{col} = %s")
                        params.append(val)

                # 3. Dynamic Date Range Filters
                date_filters = [
                    ("create_time", ">=", filters.create_time_from),
                    ("create_time", "<=", filters.create_time_to),
                    ("update_time", ">=", filters.update_time_from),
                    ("update_time", "<=", filters.update_time_to),
                ]

                for col, op, val in date_filters:
                    if val is not None:
                        conditions.append(f"{col} {op} %s")
                        params.append(val)

                # 4. Construct the WHERE clause
                where_clause = ""
                if conditions:
                    where_clause = " WHERE " + " AND ".join(conditions)

                # 5. First, get the TOTAL COUNT (for frontend pagination)
                count_query = f"SELECT COUNT(*) {base_query} {where_clause}"
                await cur.execute(count_query, params)
                total_count = (await cur.fetchone())["count"]

                # 6. Add Sorting (Sanitize sort_by to prevent injection)
                allowed_cols = {"create_time", "update_time", "account", "status"}
                safe_sort_col = filters.sort_by if filters.sort_by in allowed_cols else "update_time"
                safe_order = "DESC" if filters.sort_order.lower() == "desc" else "ASC"
                
                # 7. Final Data Query
                data_query = (
                    f"SELECT * {base_query} {where_clause} "
                    f"ORDER BY {safe_sort_col} {safe_order} "
                    f"LIMIT %s OFFSET %s"
                )
                
                # Add limit/offset to parameters
                await cur.execute(data_query, params + [filters.limit, filters.offset])
                trades = await cur.fetchall()

                return {
                    "total": total_count,
                    "limit": filters.limit,
                    "offset": filters.offset,
                    "data": trades
                }

    except Exception as e:
        print(f"Error fetching trades: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@api_router.get("/trades/{id}")
async def get_trade_by_id(id: int):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute("SELECT * FROM trades WHERE id = %s", (id,))
                trade = await cur.fetchone()

            if not trade:
                raise HTTPException(status_code=404, detail=f"Trade {id} not found")
            return trade

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")

@api_router.get("/transactions/{id}")
async def get_transaction_by_id(id: int):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT * FROM transactions WHERE id=%s", (id,))
                transaction = await cur.fetchone()

                if not transaction:
                    raise HTTPException(
                        status_code=404, detail=f"Transaction {id} not found"
                    )
                return transaction
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")


@api_router.get("/trades/{trade_id}/transactions")
async def get_transactions_by_trade_id(trade_id: int):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT * FROM transactions WHERE trade_id=%s", (trade_id,)
                )
                transactions = await cur.fetchall()

                return transactions if transactions else []
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")
    
# ==========================================
# NEW ENDPOINT: Get Full Graph Data
# ==========================================
@api_router.get("/trades/{trade_id}/graph")
async def get_trade_graph(trade_id: int):
    """
    Fetches the full lifecycle of a trade from Neptune, including 
    metadata, transactions, counterparties, and exceptions.
    """
    if not app.state.neptune_driver:
         raise HTTPException(status_code=503, detail="Neptune Graph Service is currently unavailable")

    query = """
    MATCH (t:Trade {id: $trade_id})
    OPTIONAL MATCH (t)-[r1:BOOKED_ON|AFFIRMED_BY|CLEARED_BY]->(meta:Entity)
    OPTIONAL MATCH (t)-[:HAS_TRANSACTION]->(tx:Transaction)
    OPTIONAL MATCH (tx)-[r2:RECEIVED_FROM|SENT_TO]->(party:Entity)
    OPTIONAL MATCH (tx)-[:GENERATED_EXCEPTION]->(e:Exception)
    RETURN 
        t, 
        collect(DISTINCT meta) as metadata, 
        collect(DISTINCT tx) as transactions, 
        collect(DISTINCT party) as counterparties, 
        collect(DISTINCT e) as exceptions
    """
    
    try:
        with app.state.neptune_driver.session() as session:
            result = session.run(query, trade_id=str(trade_id))
            record = result.single()

            if not record or not record.get('t'):
                raise HTTPException(status_code=404, detail=f"Graph data for Trade {trade_id} not found")

            # Parse the Neo4j Node objects into standard Python dictionaries for JSON serialization
            return {
                "trade": dict(record.get('t').items()),
                "metadata": [dict(node.items()) for node in record.get('metadata')],
                "transactions": [dict(node.items()) for node in record.get('transactions')],
                "counterparties": [dict(node.items()) for node in record.get('counterparties')],
                "exceptions": [dict(node.items()) for node in record.get('exceptions')]
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Neptune Query Error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching graph data")
    
@api_router.get("/graph/overview")
async def get_graph_overview(limit: int = 100, status: Optional[str] = None):
    """
    Fetches a bounded overview of the graph. 
    Can be filtered by Trade status (e.g., ?status=REJECTED)
    """
    if not app.state.neptune_driver:
        raise HTTPException(status_code=503, detail="Neptune Graph Service is unavailable")

    # The query targets trades (filtered by status), then finds everything 
    # up to 2 "hops" away (Trade -> Transaction -> Exception/Counterparty)
    query = """
    MATCH (t:Trade)
    WHERE $status IS NULL OR t.status = $status
    WITH t LIMIT $limit
    
    // 1st Hop: Direct relationships (Transactions, Booking Systems, Clearing Houses)
    OPTIONAL MATCH (t)-[r1]-(n1)
    
    // 2nd Hop: Secondary relationships (Exceptions or Counterparties tied to the Transaction)
    OPTIONAL MATCH (n1:Transaction)-[r2]-(n2)
    
    RETURN t, r1, n1, r2, n2
    """

    try:
        with app.state.neptune_driver.session() as session:
            result = session.run(query, limit=limit, status=status)
            
            # Use dictionaries to automatically deduplicate nodes and edges
            unique_nodes = {}
            unique_edges = {}

            # Helper functions to keep the loop clean
            def parse_node(node):
                if node and node.element_id not in unique_nodes:
                    unique_nodes[node.element_id] = {
                        "id": node.element_id,
                        "labels": list(node.labels),
                        "properties": dict(node.items())
                    }

            def parse_edge(rel):
                if rel and rel.element_id not in unique_edges:
                    unique_edges[rel.element_id] = {
                        "id": rel.element_id,
                        "source": rel.start_node.element_id,
                        "target": rel.end_node.element_id,
                        "type": rel.type,
                        "properties": dict(rel.items())
                    }

            # Process every row returned by the database
            for record in result:
                # Add nodes (if they exist in this row)
                parse_node(record.get('t'))
                parse_node(record.get('n1'))
                parse_node(record.get('n2'))
                
                # Add edges (if they exist in this row)
                parse_edge(record.get('r1'))
                parse_edge(record.get('r2'))

            return {
                "nodes": list(unique_nodes.values()),
                "edges": list(unique_edges.values())
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Neptune Query Error: {e}")
        raise HTTPException(status_code=500, detail="Error fetching graph overview")

app.include_router(api_router)