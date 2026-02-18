from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas.exception import ExceptionCreate, ExceptionUpdate, ExceptionResponse
from app.models import Exception

# Sample CRUD Routers. Might add pagination in the future

router = APIRouter(prefix="/api/exceptions", tags=["exceptions"])

@router.get("/", response_model=List[ExceptionResponse])
async def list_exceptions():
    exceptions = await Exception.all()
    return exceptions

@router.get("/trade/{trade_id}", response_model=List[ExceptionResponse])
async def get_exceptions_by_trade(trade_id: int):
    """Get all exceptions for a specific trade"""
    exceptions = await Exception.filter(trade_id=trade_id).all()
    return exceptions

@router.get("/{exception_id}", response_model=ExceptionResponse)
async def get_exception(exception_id: int):
    exception = await Exception.get_or_none(id=exception_id)
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    return exception

@router.post("/", response_model=ExceptionResponse, status_code=201)
async def create_exception(exception_data: ExceptionCreate):
    exception = await Exception.create(**exception_data.model_dump())
    return exception

@router.put("/{exception_id}", response_model=ExceptionResponse)
async def update_exception(exception_id: int, exception_data: ExceptionUpdate):
    exception = await Exception.get_or_none(id=exception_id)
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    await exception.update_from_dict(exception_data.model_dump(exclude_unset=True))
    await exception.save()
    return exception

@router.delete("/{exception_id}", status_code=204)
async def delete_exception(exception_id: int):
    exception = await Exception.get_or_none(id=exception_id)
    if not exception:
        raise HTTPException(status_code=404, detail="Exception not found")
    
    await exception.delete()