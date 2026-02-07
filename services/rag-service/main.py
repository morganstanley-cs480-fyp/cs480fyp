"""
RAG Service - FastAPI application entrypoint.

Orchestrates the RAG pipeline: retrieval, augmentation, and generation.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config.settings import settings
from app.api.routes import health_router, vectors_router
from app.services.vector_db import get_vector_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    vector_db = get_vector_db()
    try:
        vector_db.connect()
    except Exception as e:
        print(f"Warning: Failed to connect to Milvus: {e}")
        print("Vector database operations will not be available until connection is established.")
    
    yield
    
    # Shutdown
    try:
        vector_db.disconnect()
    except Exception:
        pass


app = FastAPI(
    title=settings.SERVICE_NAME,
    version=__version__,
    description="RAG pipeline orchestration service",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

if settings.ENABLE_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health_router)
app.include_router(vectors_router)
