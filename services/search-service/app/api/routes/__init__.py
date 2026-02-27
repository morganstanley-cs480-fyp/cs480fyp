"""API route handlers"""

from app.api.routes.health import router as health_router
from app.api.routes.search import router as search_router
from app.api.routes.history import router as history_router
from app.api.routes.filters import router as filters_router

__all__ = ["health_router", "search_router", "history_router", "filters_router"]
