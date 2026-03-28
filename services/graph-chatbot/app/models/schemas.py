import re
from pydantic import BaseModel, field_validator
from typing import Literal, Optional, ClassVar
from datetime import datetime

class AnalyticalIntent(BaseModel):
    analysis_mode: Literal["historical", "predictive"] = "historical"
    dimension_to_group_by: Optional[Literal[
        "BookingSystem", "ClearingHouse", "AffirmationSystem", 
        "AssetType", "Account", "TradeStatus", "TransactionStatus", "ExceptionStatus"
    ]] = None
    
    # The 'Hero' of the query: what are we actually counting?
    metric_target: Literal["Trade", "Transaction", "Exception"] = "Trade"
    
    # Filters
    asset_type_filter: Optional[Literal["CDS", "IRS", "FX", "MBS", "ABS"]] = None
    trade_status_filter: Optional[Literal["CLEARED", "REJECTED", "ALLEGED", "CANCELLED"]] = None
    transaction_status_filter: Optional[Literal["CLEARED", "REJECTED", "ALLEGED", "CANCELLED"]] = None
    exception_msg_filter: Optional[Literal["TIME OUT OF RANGE", "INSUFFICIENT MARGIN", "MAPPING ISSUE", "MISSING BIC"]] = None
    exception_status_filter: Optional[Literal["PENDING", "CLOSED"]] = None
    exception_priority_filter: Optional[Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]] = None
    direction_filter: Optional[Literal["send", "receive"]] = None
    
    # Time (Strict YYYY-MM-DD format)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Aggregation and Sorting
    aggregation_type: Optional[Literal["frequency", "ratio"]] = None
    sort_order: Literal["ASC", "DESC"] = "DESC"
    confidence: float
    reasoning: str
    clarification_needed: Optional[str] = None
    
    # Validation ClassVars
    VALID_ANALYSIS_MODES: ClassVar = {"historical", "predictive"}
    VALID_DIMENSIONS: ClassVar = {
        "BookingSystem", "ClearingHouse", "AffirmationSystem", 
        "Counterparty", "Account", "AssetType", "TradeStatus", "TransactionStatus", "ExceptionStatus"
    }
    VALID_EXCEPTIONS: ClassVar = {
        "TIME OUT OF RANGE", "INSUFFICIENT MARGIN", 
        "MAPPING ISSUE", "MISSING BIC"
    }
    VALID_ASSETS: ClassVar = {"CDS", "IRS", "FX", "MBS", "ABS"}
    VALID_STATUS: ClassVar = {"CLEARED", "REJECTED", "ALLEGED", "CANCELLED"}
    VALID_EXCEPTION_STATUS: ClassVar = {"PENDING", "CLOSED"}
    VALID_PRIORITIES: ClassVar = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    VALID_DIRECTIONS: ClassVar = {"send", "receive"}
    VALID_AGGREGATIONS: ClassVar = {"frequency", "ratio"}
    
    @field_validator("analysis_mode")
    @classmethod
    def validate_analysis_mode(cls, v):
        if v not in cls.VALID_ANALYSIS_MODES:
            raise ValueError(f"Invalid analysis mode: {v}")
        return v
    
    @field_validator("dimension_to_group_by")
    @classmethod
    def validate_dimension(cls, v):
        if v and v not in cls.VALID_DIMENSIONS:
            raise ValueError(f"Invalid dimension: {v}")
        return v
    
    @field_validator("metric_target")
    @classmethod
    def validate_metric_target(cls, v):
        if v not in {"Trade", "Transaction", "Exception"}:
            raise ValueError(f"Invalid metric target: {v}")
        return v
    
    @field_validator("exception_msg_filter")
    @classmethod
    def validate_exception(cls, v):
        if v and v not in cls.VALID_EXCEPTIONS:
            raise ValueError(f"Invalid exception: {v}")
        return v
    
    @field_validator("asset_type_filter")
    @classmethod
    def validate_asset(cls, v):
        if v and v not in cls.VALID_ASSETS:
            raise ValueError(f"Invalid asset type: {v}")
        return v
    
    @field_validator("trade_status_filter", "transaction_status_filter")
    @classmethod
    def validate_status(cls, v):
        if v and v not in cls.VALID_STATUS:
            raise ValueError(f"Invalid status: {v}")
        return v
    
    @field_validator("exception_status_filter")
    @classmethod
    def validate_exception_status(cls, v):
        if v and v not in cls.VALID_EXCEPTION_STATUS:
            raise ValueError(f"Invalid exception status: {v}")
        return v

    @field_validator("exception_priority_filter")
    @classmethod
    def validate_exception_priority(cls, v):
        if v and v not in cls.VALID_PRIORITIES:
            raise ValueError(f"Invalid priority: {v}")
        return v

    @field_validator("direction_filter")
    @classmethod
    def validate_direction(cls, v):
        if v and v not in cls.VALID_DIRECTIONS:
            raise ValueError(f"Invalid direction: {v}")
        return v

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date_format(cls, v):
        if v:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
                raise ValueError(f"Date must be in YYYY-MM-DD format. Received: {v}")
        return v
    
    @field_validator("aggregation_type")
    @classmethod
    def validate_aggregation(cls, v):
        if v and v not in cls.VALID_AGGREGATIONS:
            raise ValueError(f"Invalid aggregation: {v}")
        return v
    
    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v):
        if v not in {"ASC", "DESC"}:
            raise ValueError(f"Sort order must be 'ASC' or 'DESC'")
        return v
    
    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v):
        if not (0.0 <= v <= 1.0):
            raise ValueError("Confidence must be between 0.0 and 1.0")
        return v


class ChatMessage(BaseModel):
    user_id: str
    question: str


class ChatResponse(BaseModel):
    user_id: str
    question: str
    response: str
    intent: Optional[AnalyticalIntent] = None
    raw_results: Optional[list] = None
    execution_time_ms: float
    timestamp: datetime = None