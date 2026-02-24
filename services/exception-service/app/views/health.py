from fastapi import APIRouter

# Root endpoint
health_router = APIRouter(tags=["health"])

@health_router.get("/")
async def root():
    return {"message": "Exception Service is running"}

# Health check endpoint under /api/exceptions
exception_health_router = APIRouter(prefix="/api/exceptions", tags=["health"])

@exception_health_router.get("/health")
async def health():
    return {"status": "healthy"}