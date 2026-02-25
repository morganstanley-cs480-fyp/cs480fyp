"""
Filter Options Routes
Provides distinct values for trade filter dropdowns without fetching full trade data.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.database.connection import db_manager
from app.utils.logger import logger


router = APIRouter(tags=["filters"])


class FilterOptions(BaseModel):
    accounts: list[str]
    asset_types: list[str]
    booking_systems: list[str]
    affirmation_systems: list[str]
    clearing_houses: list[str]
    statuses: list[str]


@router.get(
    "/filter-options", response_model=FilterOptions, status_code=status.HTTP_200_OK
)
async def get_filter_options():
    """
    Return all distinct values for each trade filter dropdown.

    Runs a single aggregation query instead of fetching every trade row,
    so this stays fast regardless of table size.
    """
    query = """
        SELECT
            array_agg(DISTINCT account   ORDER BY account)            FILTER (WHERE account IS NOT NULL)            AS accounts,
            array_agg(DISTINCT asset_type ORDER BY asset_type)        FILTER (WHERE asset_type IS NOT NULL)         AS asset_types,
            array_agg(DISTINCT booking_system ORDER BY booking_system) FILTER (WHERE booking_system IS NOT NULL)    AS booking_systems,
            array_agg(DISTINCT affirmation_system ORDER BY affirmation_system) FILTER (WHERE affirmation_system IS NOT NULL) AS affirmation_systems,
            array_agg(DISTINCT clearing_house ORDER BY clearing_house) FILTER (WHERE clearing_house IS NOT NULL)   AS clearing_houses,
            array_agg(DISTINCT status ORDER BY status)                FILTER (WHERE status IS NOT NULL)            AS statuses
        FROM trades;
    """

    try:
        async with db_manager.acquire() as conn:
            row = await conn.fetchrow(query)

        return FilterOptions(
            accounts=list(row["accounts"] or []),
            asset_types=list(row["asset_types"] or []),
            booking_systems=list(row["booking_systems"] or []),
            affirmation_systems=list(row["affirmation_systems"] or []),
            clearing_houses=list(row["clearing_houses"] or []),
            statuses=list(row["statuses"] or []),
        )

    except Exception as e:
        logger.error(f"Failed to fetch filter options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve filter options",
        )
