import os
import contextlib
from typing import Optional
from fastapi import FastAPI, HTTPException, APIRouter, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
import neo4j

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")
NEPTUNE_ENDPOINT = os.getenv("NEPTUNE_ENDPOINT")

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = AsyncConnectionPool(
        conninfo=DATABASE_URL,
        min_size=1,
        max_size=20,
        kwargs={"autocommit": True}
    )
    await app.state.pool.open()
    print("Connected to Database")
    yield
    await app.state.pool.close()
    print("Database connection closed")


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
                return {"status": "ok", "time": result[0]}
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

@api_router.get("/trades/{trade_id}/graph")
async def get_trade_graph_journey(trade_id: int):
    """
    Fetches the visual journey of a trade from Neptune.
    Useful for frontend graph visualizations.
    """
    if not hasattr(app.state, 'neptune_driver'):
        raise HTTPException(status_code=500, detail="Neptune connection not configured")

    query = """
    MATCH (t:Trade {id: $id})
    OPTIONAL MATCH (t)-[r1:HAS_TRANSACTION]->(tx:Transaction)
    OPTIONAL MATCH (tx)-[r2:GENERATED_EXCEPTION]->(e:Exception)
    RETURN t, r1, tx, r2, e
    """
    
    try:
        # Neptune queries are synchronous in the standard driver, 
        # so we run it in the session
        with app.state.neptune_driver.session() as session:
            result = session.run(query, id=str(trade_id))
            
            # Format the output for the frontend
            nodes = []
            links = []
            seen_nodes = set()

            for record in result:
                # Process Trade, Transaction, and Exception nodes
                for key in ['t', 'tx', 'e']:
                    node = record.get(key)
                    if node and node.element_id not in seen_nodes:
                        nodes.append({
                            "id": node.element_id,
                            "label": list(node.labels),
                            "properties": dict(node)
                        })
                        seen_nodes.add(node.element_id)
                
                # Process Relationships
                for key in ['r1', 'r2']:
                    rel = record.get(key)
                    if rel:
                        links.append({
                            "source": rel.start_node.element_id,
                            "target": rel.end_node.element_id,
                            "type": rel.type
                        })

            return {"nodes": nodes, "links": links}

    except Exception as e:
        print(f"Neptune Error: {e}")
        raise HTTPException(status_code=500, detail="Error querying graph data")

app.include_router(api_router)