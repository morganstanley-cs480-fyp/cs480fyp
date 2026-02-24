from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/")
async def root():
    return {"message": "Exception Service is running"}

@router.get("/api/exceptions/health")
async def health():
    return {"status": "healthy"}