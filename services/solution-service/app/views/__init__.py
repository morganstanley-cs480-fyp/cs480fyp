from .solution import router as solution_router
from .health import health_router, solution_health_router

__all__ = ["solution_router", "health_router", "solution_health_router"]