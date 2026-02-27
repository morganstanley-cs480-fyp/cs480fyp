"""
Health and readiness endpoints for load balancers and orchestration.
"""

from datetime import datetime

from fastapi import APIRouter

from app.config.settings import settings

# Root endpoint
health_router = APIRouter(tags=["health"])


@health_router.get("/")
async def root():
    """Root endpoint - service info and connectivity check."""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "status": "running",
        "description": "RAG pipeline orchestration service",
    }


# Health check endpoints under /api/rag
rag_health_router = APIRouter(prefix="/api/rag", tags=["health"])


@rag_health_router.get("/health")
async def health():
    """Health check for ALB/ECS. Returns 200 when the service can accept traffic."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }


@rag_health_router.get("/health/live")
async def liveness():
    """Liveness probe - process is running. No dependency checks."""
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
    }
