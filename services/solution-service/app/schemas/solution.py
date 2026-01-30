from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# Defines Pydantic models for data validation
# Ensures data is validated before hitting the database
# Also automatically convert database models to JSON responses
# from_attributes converts Tortoise models to Pydantic models

class SolutionBase(BaseModel):    
    exception_id: int
    title: str
    exception_description: Optional[str] = None
    reference_event: Optional[str] = None
    solution_description: Optional[str] = None
    scores: int = Field(..., ge=0, le=27, description="Score must be between 0 and 27")

class SolutionCreate(SolutionBase):
    pass

class SolutionUpdate(BaseModel):
    exception_id: Optional[int] = None
    title: Optional[str] = None
    exception_description: Optional[str] = None
    reference_event: Optional[str] = None
    solution_description: Optional[str] = None
    scores: Optional[int] = Field(None, ge=0, le=27, description="Score must be between 0 and 27")

class SolutionResponse(SolutionBase):
    id: int
    create_time: datetime

    class Config:
        from_attributes = True