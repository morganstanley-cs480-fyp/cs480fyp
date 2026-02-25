"""
Search API Routes
POST /search endpoint for natural language and manual trade searches.
"""

from fastapi import APIRouter, HTTPException, status

from app.models.request import SearchRequest
from app.models.response import SearchResponse
from app.services.search_orchestrator import search_orchestrator
from app.utils.logger import logger
from app.utils.exceptions import (
    SearchServiceException,
    InvalidSearchRequestError,
    BedrockAPIError,
    DatabaseQueryError,
)


router = APIRouter(tags=["search"])


@router.post("/search", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def search_trades(request: SearchRequest):
    """
    Execute trade search using natural language query or manual filters.

    **Natural Language Search Flow:**
    1. Extract parameters from query using AWS Bedrock (Claude 3.5 Sonnet)
    2. Build parameterized SQL query from extracted parameters
    3. Execute query against trades database
    4. Save query to history
    5. Return results with metadata

    **Manual Search Flow:**
    1. Build parameterized SQL query from manual filters
    2. Execute query against trades database
    3. Save query to history
    4. Return results with metadata

    **Request Body (Natural Language):**
    ```json
    {
      "user_id": "user123",
      "search_type": "natural_language",
      "query_text": "show me pending FX trades from last week"
    }
    ```

    **Request Body (Manual):**
    ```json
    {
      "user_id": "user123",
      "search_type": "manual",
      "filters": {
        "asset_type": "FX",
        "status": ["ALLEGED", "CLEARED"],
        "date_from": "2025-01-13",
        "date_to": "2025-01-20"
      }
    }
    ```

    **Response:**
    ```json
    {
      "query_id": 42,
      "total_results": 15,
      "results": [...],
      "search_type": "natural_language",
      "cached": false,
      "execution_time_ms": 234.5,
      "extracted_params": {...}
    }
    ```

    **Error Responses:**
    - 400: Invalid request (missing required fields, validation failed)
    - 422: AI response parsing error or validation error
    - 500: Database error or internal server error
    - 502: Bedrock API unavailable
    - 503: Database unavailable
    """
    logger.info(
        "Received search request",
        extra={"user_id": request.user_id, "search_type": request.search_type},
    )

    try:
        # Execute search through orchestrator
        result = await search_orchestrator.execute_search(request)

        return result

    except InvalidSearchRequestError:
        # 400 - already handled by exception handler
        raise

    except BedrockAPIError:
        # 502 Bad Gateway - already handled by exception handler
        raise

    except DatabaseQueryError:
        # 500/503 - already handled by exception handler
        raise

    except SearchServiceException as e:
        # Generic search service error
        logger.error(
            f"Search service error: {e.message}",
            extra={"user_id": request.user_id, "details": e.details},
        )
        raise

    except Exception as e:
        # Unexpected error
        logger.error(
            f"Unexpected error in search endpoint: {e}",
            extra={"user_id": request.user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred during search execution.",
            },
        )
