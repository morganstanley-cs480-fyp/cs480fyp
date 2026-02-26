"""
RAG Service - FastAPI application entrypoint.

Orchestrates the RAG pipeline: retrieval, augmentation, and generation.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config.settings import settings
from app.api.routes import health_router, rag_health_router, chat_router
from app.api.routes.documents import router as documents_router
from app.api.routes.generate import router as generate_router
from app.services.vector_store import MilvusVectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup
    vector_store = MilvusVectorStore()
    vector_store.connect()
    vector_store.initialize()
    app.state.vector_store = vector_store
    
    yield
    
    # Shutdown
    app.state.vector_store.close()


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

# Include routers (order matters: specific routes before parameterized ones)
app.include_router(health_router)
app.include_router(rag_health_router)  # Must be before other /api/rag routes
app.include_router(documents_router)
app.include_router(generate_router)
app.include_router(chat_router)
