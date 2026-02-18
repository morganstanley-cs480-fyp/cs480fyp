"""
API Contract Definition - Frontend-Backend Integration
This file defines the exact request/response format between frontend and backend.
"""

from typing import Optional, Literal

from pydantic import BaseModel, Field


# ============================================================================
# REQUEST MODELS (Frontend → Backend)
# ============================================================================

class ManualSearchFilters(BaseModel):
    """
    Manual search filters from frontend dropdown selections.
    Maps directly to frontend ManualSearchFilters interface.
    """
    trade_id: Optional[str] = Field(None, description="Trade ID to search for")
    account: Optional[str] = Field(None, description="Account filter")
    asset_type: Optional[str] = Field(None, description="Asset type (FX, EQUITY, BOND, etc.)")
    booking_system: Optional[str] = Field(None, description="Booking system filter")
    affirmation_system: Optional[str] = Field(None, description="Affirmation system filter")
    clearing_house: Optional[str] = Field(None, description="Clearing house filter")
    status: Optional[list[str]] = Field(default_factory=list, description="Status filters (can be multiple)")
    date_type: Literal["create_time", "update_time"] = Field("update_time", description="Which date field to filter on")
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    with_exceptions_only: bool = Field(False, description="Only show trades with exceptions")
    cleared_trades_only: bool = Field(False, description="Only show cleared trades")


class SearchRequest(BaseModel):
    """
    Main search request supporting both natural language and manual search.
    
    Frontend Usage:
    - Natural Language: { user_id, search_type: "natural_language", query_text }
    - Manual Search: { user_id, search_type: "manual", filters }
    """
    user_id: str = Field(..., description="User ID from authentication")
    search_type: Literal["natural_language", "manual"] = Field(..., description="Type of search")
    
    # For natural language search
    query_text: Optional[str] = Field(None, description="Natural language query (required if search_type='natural_language')")
    
    # For manual search
    filters: Optional[ManualSearchFilters] = Field(None, description="Manual search filters (required if search_type='manual')")
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "user_id": "user123",
                    "search_type": "natural_language",
                    "query_text": "show me pending FX trades from last week"
                },
                {
                    "user_id": "user123",
                    "search_type": "manual",
                    "filters": {
                        "asset_type": "FX",
                        "status": ["PENDING", "ALLEGED"],
                        "date_type": "update_time",
                        "date_from": "2025-01-13",
                        "date_to": "2025-01-20"
                    }
                }
            ]
        }


class UpdateHistoryRequest(BaseModel):
    """
    Request to update a query history record (save/rename).
    Used when user clicks "Save" button on a search result.
    """
    is_saved: bool = Field(..., description="Whether to save this query")
    query_name: Optional[str] = Field(None, description="Name for saved query (required if is_saved=True)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_saved": True,
                "query_name": "My weekly FX review"
            }
        }


# ============================================================================
# RESPONSE MODELS (Backend → Frontend)
# ============================================================================

class Trade(BaseModel):
    """
    Trade record matching frontend Trade interface.
    All field names must match frontend exactly (snake_case).
    """
    trade_id: str
    account: str
    asset_type: str
    booking_system: str
    affirmation_system: str
    clearing_house: str
    create_time: str  # ISO 8601 format: "2025-01-15 09:30:00"
    update_time: str  # ISO 8601 format: "2025-01-15 10:00:00"
    status: Literal["CANCELLED", "ALLEGED", "REJECTED", "CLEARED"]
    
    class Config:
        json_schema_extra = {
            "example": {
                "trade_id": "10001234",
                "account": "ACC12345",
                "asset_type": "FX",
                "booking_system": "BookingA",
                "affirmation_system": "AffirmA",
                "clearing_house": "DTCC",
                "create_time": "2025-01-15 09:30:00",
                "update_time": "2025-01-15 10:00:00",
                "status": "CLEARED"
            }
        }


class SearchResponse(BaseModel):
    """
    Response from search endpoint.
    Returns query_id for history tracking and list of matching trades.
    """
    query_id: int = Field(..., description="ID of saved query history record")
    total_results: int = Field(..., description="Total number of results found")
    results: list[Trade] = Field(..., description="List of matching trades")
    search_type: str = Field(..., description="Type of search performed")
    cached: bool = Field(False, description="Whether result was from cache")
    execution_time_ms: Optional[float] = Field(None, description="Query execution time in milliseconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_id": 42,
                "total_results": 2,
                "results": [
                    {
                        "trade_id": "10001234",
                        "account": "ACC12345",
                        "asset_type": "FX",
                        "booking_system": "BookingA",
                        "affirmation_system": "AffirmA",
                        "clearing_house": "DTCC",
                        "create_time": "2025-01-15 09:30:00",
                        "update_time": "2025-01-15 10:00:00",
                        "status": "CLEARED"
                    }
                ],
                "search_type": "natural_language",
                "cached": False,
                "execution_time_ms": 234.5
            }
        }


class QueryHistory(BaseModel):
    """
    Query history record.
    Used in history list responses.
    """
    query_id: int
    user_id: str
    query_text: str
    is_saved: bool
    query_name: Optional[str] = None
    create_time: str  # ISO 8601 format
    last_use_time: str  # ISO 8601 format
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_id": 42,
                "user_id": "user123",
                "query_text": "show me pending FX trades from last week",
                "is_saved": True,
                "query_name": "Weekly FX Review",
                "create_time": "2025-01-18 10:00:00",
                "last_use_time": "2025-01-20 09:00:00"
            }
        }


class HistoryListResponse(BaseModel):
    """
    Response from GET /history endpoint.
    Returns list of user's query history.
    """
    user_id: str
    total_count: int
    saved_count: int
    recent_count: int
    queries: list[QueryHistory]
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "total_count": 10,
                "saved_count": 3,
                "recent_count": 7,
                "queries": []
            }
        }


class HealthResponse(BaseModel):
    """Response from health check endpoint"""
    status: Literal["healthy", "unhealthy"]
    service: str
    version: str
    database: str
    cache: str
    timestamp: str
    
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
    """Standard error response format"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")
    timestamp: str = Field(..., description="Error timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "ValidationError",
                "message": "Invalid search request: query_text is required for natural_language search",
                "details": {"field": "query_text"},
                "timestamp": "2025-01-20T10:00:00Z"
            }
        }


# ============================================================================
# API ENDPOINT SPECIFICATION
# ============================================================================

API_SPECIFICATION = """
# Search Service API Specification

Base URL: http://localhost:8000 (local) or https://api.example.com (production)

## Endpoints

### 1. Search Trades
POST /search
Content-Type: application/json

Request Body: SearchRequest
Response: SearchResponse (200) or ErrorResponse (400, 500, 503)

### 2. Get Query History
GET /history?user_id={user_id}&limit={limit}&saved_only={bool}

Query Parameters:
- user_id: string (required)
- limit: integer (optional, default: 50)
- saved_only: boolean (optional, default: false)

Response: HistoryListResponse (200) or ErrorResponse (400, 404)

### 3. Update Query History
PUT /history/{query_id}
Content-Type: application/json

Request Body: UpdateHistoryRequest
Response: QueryHistory (200) or ErrorResponse (400, 404)

### 4. Delete Query History
DELETE /history/{query_id}

Response: 204 No Content or ErrorResponse (404)

### 5. Health Check
GET /health

Response: HealthResponse (200)

## Frontend Integration Notes

1. All dates are in format: "YYYY-MM-DD HH:MM:SS" (local time)
2. All field names use snake_case (matches database schema)
3. Status values: CANCELLED, ALLEGED, REJECTED, CLEARED
4. Asset types: FX, EQUITY, BOND, COMMODITY, CDS
5. User authentication is handled upstream (API Gateway/ALB)
6. query_id is auto-generated on each search for history tracking
"""
