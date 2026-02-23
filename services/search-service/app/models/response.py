"""
Response models for API endpoints.
These define the structure of responses sent back to the frontend.
"""

from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.domain import Trade, QueryHistory, ExtractedParams


class SearchResponse(BaseModel):
    """
    Response from POST /search endpoint.
    Returns query_id for history tracking and list of matching trades.
    """
    query_id: int = Field(..., description="ID of saved query history record")
    total_results: int = Field(..., description="Total number of results found")
    results: list[Trade] = Field(..., description="List of matching trades")
    search_type: str = Field(..., description="Type of search performed (natural_language or manual)")
    cached: bool = Field(False, description="Whether result was from cache")
    execution_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    extracted_params: Optional[ExtractedParams] = Field(None, description="Extracted parameters (for natural_language searches only)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_id": 42,
                "total_results": 2,
                "results": [
                    {
                        "trade_id": 10001234,
                        "account": "ACC12345",
                        "asset_type": "FX",
                        "booking_system": "HIGHGARDEN",
                        "affirmation_system": "TRAI",
                        "clearing_house": "DTCC",
                        "create_time": "2025-01-15 09:30:00",
                        "update_time": "2025-01-15 10:00:00",
                        "status": "CLEARED"
                    },
                    {
                        "trade_id": 10001235,
                        "account": "ACC12346",
                        "asset_type": "FX",
                        "booking_system": "KINGSLANDING",
                        "affirmation_system": "MARC",
                        "clearing_house": "LCH",
                        "create_time": "2025-01-16 11:15:00",
                        "update_time": "2025-01-16 14:20:00",
                        "status": "ALLEGED"
                    }
                ],
                "search_type": "natural_language",
                "cached": False,
                "execution_time_ms": 234.5
            }
        }


class HistoryListResponse(BaseModel):
    """
    Response from GET /history endpoint.
    Returns list of user's query history with summary statistics.
    """
    user_id: str = Field(..., description="User ID")
    total_count: int = Field(..., description="Total number of queries")
    saved_count: int = Field(..., description="Number of saved/bookmarked queries")
    recent_count: int = Field(..., description="Number of recent (unsaved) queries")
    queries: list[QueryHistory] = Field(..., description="List of query history records")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "total_count": 10,
                "saved_count": 3,
                "recent_count": 7,
                "queries": [
                    {
                        "query_id": 42,
                        "user_id": "user123",
                        "query_text": "show me pending FX trades from last week",
                        "is_saved": True,
                        "query_name": "Weekly FX Review",
                        "create_time": "2025-01-18 10:00:00",
                        "last_use_time": "2025-01-20 09:00:00"
                    }
                ]
            }
        }


class UpdateHistoryResponse(BaseModel):
    """
    Response from PUT /history/{query_id} endpoint.
    Returns the updated query history record.
    """
    query_id: int = Field(..., description="Query ID that was updated")
    user_id: str = Field(..., description="User ID")
    query_text: str = Field(..., description="Query text")
    is_saved: bool = Field(..., description="Whether query is saved")
    query_name: Optional[str] = Field(None, description="Query name")
    create_time: str = Field(..., description="Creation timestamp")
    last_use_time: str = Field(..., description="Last use timestamp")
    message: str = Field(..., description="Success message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_id": 42,
                "user_id": "user123",
                "query_text": "show me pending FX trades from last week",
                "is_saved": True,
                "query_name": "Weekly FX Review",
                "create_time": "2025-01-18 10:00:00",
                "last_use_time": "2025-01-20 09:00:00",
                "message": "Query saved successfully"
            }
        }


class DeleteHistoryResponse(BaseModel):
    """
    Response from DELETE /history/{query_id} endpoint.
    """
    query_id: int = Field(..., description="Query ID that was deleted")
    message: str = Field(..., description="Success message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_id": 42,
                "message": "Query deleted successfully"
            }
        }


class HealthResponse(BaseModel):
    """
    Response from GET /health endpoint.
    Used by ECS/ALB for health checks.
    """
    status: Literal["healthy", "unhealthy"] = Field(..., description="Overall health status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    database: str = Field(..., description="Database connection status")
    cache: str = Field(..., description="Cache connection status")
    timestamp: str = Field(..., description="Health check timestamp (ISO 8601)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "search-service",
                "version": "1.0.0",
                "database": "connected",
                "cache": "connected",
                "timestamp": "2025-01-20T10:00:00Z"
            }
        }


class ErrorResponse(BaseModel):
    """
    Standard error response format for all endpoints.
    Returned on 4xx and 5xx errors.
    """
    error: str = Field(..., description="Error type/category")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp (ISO 8601)")
    path: Optional[str] = Field(None, description="Request path that caused the error")
    
    @classmethod
    def create(
        cls,
        error: str,
        message: str,
        details: Optional[dict] = None,
        path: Optional[str] = None
    ) -> "ErrorResponse":
        """
        Factory method to create error response with current timestamp.
        
        Args:
            error: Error type
            message: Error message
            details: Additional details
            path: Request path
        
        Returns:
            ErrorResponse instance
        """
        return cls(
            error=error,
            message=message,
            details=details,
            timestamp=datetime.utcnow().isoformat() + "Z",
            path=path
        )
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "error": "ValidationError",
                    "message": "Invalid search request: query_text is required for natural_language search",
                    "details": {"field": "query_text", "value": None},
                    "timestamp": "2025-01-20T10:00:00Z",
                    "path": "/search"
                },
                {
                    "error": "DatabaseError",
                    "message": "Failed to execute database query",
                    "details": {"query": "SELECT * FROM trades"},
                    "timestamp": "2025-01-20T10:00:00Z",
                    "path": "/search"
                },
                {
                    "error": "NotFoundError",
                    "message": "Query history record not found",
                    "details": {"query_id": 999},
                    "timestamp": "2025-01-20T10:00:00Z",
                    "path": "/history/999"
                },
                {
                    "error": "BedrockAPIError",
                    "message": "AI service unavailable",
                    "details": None,
                    "timestamp": "2025-01-20T10:00:00Z",
                    "path": "/search"
                }
            ]
        }


class MessageResponse(BaseModel):
    """
    Generic success message response.
    Used for simple operations that don't return complex data.
    """
    message: str = Field(..., description="Success message")
    timestamp: str = Field(..., description="Response timestamp (ISO 8601)")
    
    @classmethod
    def create(cls, message: str) -> "MessageResponse":
        """Factory method with current timestamp"""
        return cls(
            message=message,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Operation completed successfully",
                "timestamp": "2025-01-20T10:00:00Z"
            }
        }
