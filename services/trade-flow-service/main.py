import os
import contextlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row

DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT", "5432")

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


app = FastAPI(lifespan=lifespan)

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


@app.get("/trades/recent")
async def get_recent_trades(limit: int = 20):
    """Get the most recent trades sorted by update_time in descending order"""
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT * FROM trades ORDER BY update_time DESC LIMIT %s", (limit,)
                )
                trades = await cur.fetchall()
            return trades
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")


@app.get("/trades/{trade_id}/transactions")
async def get_transactions_by_trade_id(trade_id: int):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT * FROM transactions WHERE trade_id=%s", (trade_id,)
                )
                transactions = await cur.fetchall()

                # Return empty array if no transactions found (not an error)
                return transactions if transactions else []
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")


@app.get("/trades/{id}")
async def get_trade_by_id(id: int):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute("SELECT * FROM trades WHERE id = %s", (id,))
                trade = await cur.fetchone()

            if not trade:
                raise HTTPException(status_code=404,
                                    detail=f"Trade {id} not found")
            return trade

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")


@app.get("/trades")
async def get_trades(limit: int = 100, offset: int = 0):
    try:
        async with app.state.pool.connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    "SELECT * FROM trades LIMIT %s OFFSET %s", (limit, offset)
                )
                trades = await cur.fetchall()
            return trades
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Server Error")


@app.get("/transactions/{id}")
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
