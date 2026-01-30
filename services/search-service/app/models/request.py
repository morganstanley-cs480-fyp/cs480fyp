"""
Request models for API endpoints.
These define the structure of incoming requests from the frontend.
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, model_validator


class ManualSearchFilters(BaseModel):
    """
    Manual search filters from frontend dropdown selections.
    Maps directly to frontend ManualSearchFilters interface.
    """
    trade_id: Optional[int] = Field(None, description="Trade ID to search for (integer)")
    account: Optional[str] = Field(None, description="Account filter")
    asset_type: Optional[str] = Field(None, description="Asset type (FX, IRS, CDS, EQUITY, BOND, etc.)")
    booking_system: Optional[str] = Field(None, description="Booking system filter")
    affirmation_system: Optional[str] = Field(None, description="Affirmation system filter")
    clearing_house: Optional[str] = Field(None, description="Clearing house filter")
    status: list[str] = Field(default_factory=list, description="Status filters (can be multiple)")
    date_type: Literal["create_time", "update_time"] = Field("update_time", description="Which date field to filter on")
    date_from: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")
    with_exceptions_only: bool = Field(False, description="Only show trades with exceptions")
    cleared_trades_only: bool = Field(False, description="Only show cleared trades")
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: list[str]) -> list[str]:
        """Validate status values - trades can only be ALLEGED, CLEARED, REJECTED, or CANCELLED"""
        valid_statuses = {"CANCELLED", "ALLEGED", "REJECTED", "CLEARED"}
        for status in v:
            if status not in valid_statuses:
                raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
        return v
    
    @field_validator("date_from", "date_to")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate date format is YYYY-MM-DD"""
        if v is None:
            return v
        
        # Basic format check
        if len(v) != 10 or v[4] != "-" or v[7] != "-":
            raise ValueError(f"Invalid date format: {v}. Must be YYYY-MM-DD")
        
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "asset_type": "FX",
                "status": ["ALLEGED", "CLEARED"],
                "date_type": "update_time",
                "date_from": "2025-01-13",
                "date_to": "2025-01-20",
                "cleared_trades_only": False,
                "with_exceptions_only": False
            }
        }


class SearchRequest(BaseModel):
    """
    Main search request supporting both natural language and manual search.
    
    Frontend Usage:
    - Natural Language: { user_id, search_type: "natural_language", query_text }
    - Manual Search: { user_id, search_type: "manual", filters }
    """
    user_id: str = Field(..., description="User ID from authentication", min_length=1)
    search_type: Literal["natural_language", "manual"] = Field(..., description="Type of search")
    
    # For natural language search
    query_text: Optional[str] = Field(None, description="Natural language query (required if search_type='natural_language')")
    
    # For manual search
    filters: Optional[ManualSearchFilters] = Field(None, description="Manual search filters (required if search_type='manual')")
    
    @model_validator(mode="after")
    def validate_search_requirements(self):
        """Ensure query_text or filters are provided based on search_type"""
        if self.search_type == "natural_language":
            if not self.query_text or not self.query_text.strip():
                raise ValueError("query_text is required for natural_language search")
            if len(self.query_text.strip()) < 3:
                raise ValueError("query_text must be at least 3 characters")
        
        if self.search_type == "manual":
            if self.filters is None:
                raise ValueError("filters are required for manual search")
        
        return self
    
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
                        "status": ["ALLEGED", "CLEARED"],
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
    
    @model_validator(mode="after")
    def validate_save_requirements(self):
        """Ensure query_name is provided when saving"""
        if self.is_saved and (not self.query_name or not self.query_name.strip()):
            raise ValueError("query_name is required when is_saved=True")
        
        if self.query_name and len(self.query_name.strip()) > 255:
            raise ValueError("query_name must be 255 characters or less")
        
        # Normalize whitespace
        if self.query_name:
            self.query_name = self.query_name.strip()
        
        return self
    
    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "is_saved": True,
                    "query_name": "My weekly FX review"
                },
                {
                    "is_saved": False,
                    "query_name": None
                }
            ]
        }


class HistoryQueryParams(BaseModel):
    """
    Query parameters for GET /history endpoint.
    Used for filtering and pagination of query history.
    """
    user_id: str = Field(..., description="User ID to fetch history for")
    limit: int = Field(50, description="Maximum number of records to return", ge=1, le=100)
    saved_only: bool = Field(False, description="Return only saved/bookmarked queries")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "limit": 20,
                "saved_only": True
            }
        }
