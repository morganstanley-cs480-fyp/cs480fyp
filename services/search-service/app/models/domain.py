"""
Domain models representing core business entities.
These models map to database tables and represent the core data structures.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class Trade(BaseModel):
    """
    Trade domain model - represents a trade record from the database.
    Maps directly to the 'trades' table schema.

    Note: Database schema uses 'id INTEGER PRIMARY KEY', but we expose it as 'trade_id' in API.
    """

    trade_id: int = Field(
        ...,
        description="Trade identifier (maps to database 'id' column)",
        serialization_alias="trade_id",
    )
    account: str = Field(..., description="Account identifier (e.g., ACC12345)")
    asset_type: str = Field(
        ..., description="Asset type (FX, EQUITY, BOND, COMMODITY, CDS, IRS)"
    )
    booking_system: str = Field(..., description="Booking system name")
    affirmation_system: str = Field(..., description="Affirmation system name")
    clearing_house: str = Field(
        ..., description="Clearing house (DTCC, LCH, CME, NSCC, JSCC, OTCCHK)"
    )
    create_time: str = Field(..., description="Trade creation timestamp")
    update_time: str = Field(..., description="Trade last update timestamp")
    status: Literal["CANCELLED", "ALLEGED", "REJECTED", "CLEARED", "PENDING"] = Field(
        ..., description="Trade status"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "trade_id": 10001234,
                "account": "ACC12345",
                "asset_type": "FX",
                "booking_system": "HIGHGARDEN",
                "affirmation_system": "TRAI",
                "clearing_house": "DTCC",
                "create_time": "2025-01-15 09:30:00",
                "update_time": "2025-01-15 10:00:00",
                "status": "CLEARED",
            }
        }

    @classmethod
    def from_db_record(cls, record) -> "Trade":
        """
        Create Trade instance from database record.

        Args:
            record: asyncpg.Record from database query

        Returns:
            Trade instance

        Note: Database column 'id' is mapped to model field 'trade_id'
        """
        return cls(
            trade_id=record["id"],  # Database uses 'id' column
            account=record["account"],
            asset_type=record["asset_type"],
            booking_system=record["booking_system"],
            affirmation_system=record["affirmation_system"],
            clearing_house=record["clearing_house"],
            create_time=record["create_time"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(record["create_time"], datetime)
            else record["create_time"],
            update_time=record["update_time"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(record["update_time"], datetime)
            else record["update_time"],
            status=record["status"],
        )


class QueryHistory(BaseModel):
    """
    Query history domain model - represents a saved query from the database.
    Maps directly to the 'query_history' table schema.
    """

    query_id: int = Field(..., description="Auto-generated query identifier")
    user_id: str = Field(..., description="User who created the query")
    query_text: str = Field(..., description="Original query text or JSON filters")
    is_saved: bool = Field(False, description="Whether user bookmarked this query")
    query_name: Optional[str] = Field(
        None, description="User-provided name for saved query"
    )
    create_time: str = Field(..., description="Query creation timestamp")
    last_use_time: str = Field(..., description="Last time query was executed")

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
            }
        }

    @classmethod
    def from_db_record(cls, record) -> "QueryHistory":
        """
        Create QueryHistory instance from database record.

        Args:
            record: asyncpg.Record from database query

        Returns:
            QueryHistory instance
        """
        return cls(
            query_id=record["id"],  # Database column is 'id', map to 'query_id'
            user_id=record["user_id"],
            query_text=record["query_text"],
            is_saved=record["is_saved"],
            query_name=record["query_name"],
            create_time=record["create_time"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(record["create_time"], datetime)
            else record["create_time"],
            last_use_time=record["last_use_time"].strftime("%Y-%m-%dT%H:%M:%SZ")
            if isinstance(record["last_use_time"], datetime)
            else record["last_use_time"],
        )


class ExtractedParams(BaseModel):
    """
    Parameters extracted from natural language query by Bedrock.
    Used internally to translate NL query → SQL.
    All fields use lists to support multiple values (e.g., ["FX", "EQUITY"]).
    """

    trade_id: Optional[int] = None
    accounts: Optional[list[str]] = None
    asset_types: Optional[list[str]] = None
    booking_systems: Optional[list[str]] = None
    affirmation_systems: Optional[list[str]] = None
    clearing_houses: Optional[list[str]] = None
    statuses: Optional[list[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    with_exceptions_only: bool = False
    cleared_trades_only: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "trade_id": None,
                "accounts": ["ACC123", "ACC456"],
                "asset_types": ["FX", "IRS"],
                "booking_systems": None,
                "affirmation_systems": None,
                "clearing_houses": ["LCH"],
                "statuses": ["ALLEGED", "CLEARED"],
                "date_from": "2025-01-13",
                "date_to": "2025-01-20",
                "with_exceptions_only": False,
                "cleared_trades_only": False,
            }
        }
