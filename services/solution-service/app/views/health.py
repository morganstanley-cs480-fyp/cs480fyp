from fastapi import APIRouter

# Root endpoint
health_router = APIRouter(tags=["health"])

@health_router.get("/")
async def root():
    return {"message": "Solution Service is running"}

# Health check endpoint under /api/solutions
solution_health_router = APIRouter(prefix="/api/solutions", tags=["health"])

@solution_health_router.get("/health")
async def health():
    return {"status": "healthy"}