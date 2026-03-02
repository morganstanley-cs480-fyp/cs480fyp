from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.exception import ExceptionStatus

# Defines Pydantic models for data validation
# Ensures data is validated before hitting the database
# Also automatically convert database models to JSON responses
# from_attributes converts Tortoise models to Pydantic models


class ExceptionBase(BaseModel):
    trade_id: int
    trans_id: int
    msg: str
    priority: str
    status: ExceptionStatus = ExceptionStatus.PENDING
    comment: Optional[str] = None


class ExceptionCreate(ExceptionBase):
    pass


class ExceptionUpdate(BaseModel):
    trade_id: Optional[int] = None
    trans_id: Optional[int] = None
    msg: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[ExceptionStatus] = None
    comment: Optional[str] = None


class ExceptionResponse(ExceptionBase):
    id: int
    create_time: datetime
    update_time: datetime

    class Config:
        from_attributes = True
