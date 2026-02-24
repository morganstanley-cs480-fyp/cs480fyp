from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/")
async def root():
    return {"message": "Solution Service is running"}

@router.get("/api/solutions/health")
async def health():
    return {"status": "healthy"}