"""API route handlers."""

from app.api.routes.health import router as health_router
from app.api.routes.vectors import router as vectors_router

__all__ = ["health_router", "vectors_router"]
