"""
Query History API Routes
GET /api/history, PUT /api/history/{query_id}, DELETE /api/history/{query_id}
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Path, status

from app.models.request import UpdateHistoryRequest
from app.models.domain import QueryHistory
from app.models.response import TypeaheadSuggestion
from app.services.query_history_service import query_history_service
from app.utils.logger import logger
from app.utils.exceptions import (
    QueryHistoryNotFoundError,
    UnauthorizedAccessError,
    DatabaseQueryError,
)


router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[QueryHistory])
async def get_history(
    user_id: str = Query(..., description="User ID to fetch history for", min_length=1),
    limit: int = Query(
        50, description="Maximum number of records to return", ge=1, le=100
    ),
    saved_only: bool = Query(False, description="Return only saved/bookmarked queries"),
):
    """
    Get query history for a user.

    Returns a list of previous queries ordered by last_use_time DESC.
    Supports filtering to show only saved queries.

    **Query Parameters:**
    - `user_id`: User ID (required)
    - `limit`: Max records to return (1-100, default: 50)
    - `saved_only`: If true, return only bookmarked queries (default: false)

    **Example Request:**
    ```
    GET /history?user_id=user123&limit=20&saved_only=true
    ```

    **Response:**
    ```json
    [
      {
        "query_id": 42,
        "user_id": "user123",
        "query_text": "show me pending FX trades from last week",
        "is_saved": true,
        "query_name": "Weekly FX Review",
        "create_time": "2025-01-18 10:00:00",
        "last_use_time": "2025-01-20 09:00:00"
      },
      ...
    ]
    ```

    **Error Responses:**
    - 500: Database error
    """
    logger.info(
        "Fetching query history",
        extra={"user_id": user_id, "limit": limit, "saved_only": saved_only},
    )

    try:
        history_list = await query_history_service.get_user_history(
            user_id=user_id, limit=limit, saved_only=saved_only
        )

        return history_list

    except DatabaseQueryError as e:
        logger.error(
            f"Failed to fetch query history: {e.message}", extra={"user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Database error",
                "message": "Failed to retrieve query history.",
            },
        )

    except Exception as e:
        logger.error(
            f"Unexpected error fetching history: {e}",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.get("/saved-queries", response_model=list[QueryHistory])
async def get_saved_queries(
    user_id: str = Query(
        ..., description="User ID to fetch saved queries for", min_length=1
    ),
    limit: int = Query(
        50, description="Maximum number of records to return", ge=1, le=100
    ),
):
    """
    Get saved/bookmarked queries for a user.

    Returns only queries where is_saved = TRUE, ordered by last_use_time DESC.

    **Query Parameters:**
    - `user_id`: User ID (required)
    - `limit`: Max records to return (1-100, default: 50)
    """
    logger.info("Fetching saved queries", extra={"user_id": user_id, "limit": limit})

    try:
        saved_queries = await query_history_service.get_user_history(
            user_id=user_id, limit=limit, saved_only=True
        )

        return saved_queries

    except DatabaseQueryError:
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error fetching saved queries: {e}",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.get("/suggestions", response_model=list[TypeaheadSuggestion])
async def get_typeahead_suggestions(
    user_id: str = Query(
        ..., description="User ID to fetch suggestions for", min_length=1
    ),
    q: str = Query(..., description="Search input to match", min_length=1),
    limit: int = Query(
        10, description="Maximum number of suggestions to return", ge=1, le=20
    ),
):
    """
    Get typeahead suggestions for a user's search input.
    Uses fuzzy matching against recent query history.
    """
    logger.info(
        "Fetching typeahead suggestions",
        extra={"user_id": user_id, "query": q, "limit": limit},
    )

    try:
        suggestions = await query_history_service.get_suggestions(
            user_id=user_id, query=q, limit=limit
        )

        def format_time(value) -> str | None:
            if isinstance(value, datetime):
                return value.strftime("%Y-%m-%dT%H:%M:%SZ")
            if value is None:
                return None
            return str(value)

        return [
            TypeaheadSuggestion(
                query_id=item["query_id"],
                query_text=item["query_text"],
                is_saved=item["is_saved"],
                query_name=item["query_name"],
                last_use_time=format_time(item.get("last_use_time")),
                score=round(float(item["score"]), 4),
                category=item.get("category"),
            )
            for item in suggestions
        ]

    except DatabaseQueryError:
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error fetching suggestions: {e}",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.put("/{query_id}", response_model=QueryHistory)
async def update_history(
    query_id: int = Path(..., description="Query ID to update", ge=1),
    user_id: str = Query(
        ..., description="User ID (for ownership validation)", min_length=1
    ),
    update: UpdateHistoryRequest = ...,
):
    """
    Update a query's saved status and name.

    Used to save/bookmark a query or rename a saved query.
    Validates that the user owns the query before updating.

    **Path Parameters:**
    - `query_id`: ID of query to update

    **Query Parameters:**
    - `user_id`: User ID (for ownership validation)

    **Request Body:**
    ```json
    {
      "is_saved": true,
      "query_name": "My weekly FX review"
    }
    ```

    **Response:**
    ```json
    {
      "query_id": 42,
      "user_id": "user123",
      "query_text": "show me pending FX trades from last week",
      "is_saved": true,
      "query_name": "My weekly FX review",
      "create_time": "2025-01-18 10:00:00",
      "last_use_time": "2025-01-20 09:00:00"
    }
    ```

    **Error Responses:**
    - 403: User doesn't own this query
    - 404: Query not found
    - 500: Database error
    """
    logger.info(
        "Updating query history",
        extra={"query_id": query_id, "user_id": user_id, "is_saved": update.is_saved},
    )

    try:
        updated_history = await query_history_service.update_query(
            query_id=query_id,
            user_id=user_id,
            is_saved=update.is_saved,
            query_name=update.query_name,
        )

        return updated_history

    except QueryHistoryNotFoundError:
        # 404 - already handled by exception handler
        raise

    except UnauthorizedAccessError:
        # 403 - already handled by exception handler
        raise

    except DatabaseQueryError:
        # 500 - already handled by exception handler
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error updating history: {e}",
            extra={"query_id": query_id, "user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history(
    query_id: int = Path(..., description="Query ID to delete", ge=1),
    user_id: str = Query(
        ..., description="User ID (for ownership validation)", min_length=1
    ),
):
    """
    Delete a query from history.

    Validates that the user owns the query before deleting.
    Returns 204 No Content on success.

    **Path Parameters:**
    - `query_id`: ID of query to delete

    **Query Parameters:**
    - `user_id`: User ID (for ownership validation)

    **Example Request:**
    ```
    DELETE /history/42?user_id=user123
    ```

    **Success Response:**
    - Status: 204 No Content
    - Body: (empty)

    **Error Responses:**
    - 403: User doesn't own this query
    - 404: Query not found
    - 500: Database error
    """
    logger.info(
        "Deleting query history", extra={"query_id": query_id, "user_id": user_id}
    )

    try:
        await query_history_service.delete_query(query_id=query_id, user_id=user_id)

        # Return 204 No Content (no body)
        return None

    except QueryHistoryNotFoundError:
        # 404 - already handled by exception handler
        raise

    except UnauthorizedAccessError:
        # 403 - already handled by exception handler
        raise

    except DatabaseQueryError:
        # 500 - already handled by exception handler
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error deleting history: {e}",
            extra={"query_id": query_id, "user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.delete("", status_code=status.HTTP_200_OK)
async def clear_all_history(
    user_id: str = Query(..., description="User ID to clear history for", min_length=1),
):
    """
    Clear all query history for a user.

    Deletes all queries belonging to the specified user.
    Returns count of deleted queries.

    **Query Parameters:**
    - `user_id`: User ID whose history should be cleared

    **Example Request:**
    ```
    DELETE /history?user_id=user123
    ```

    **Success Response:**
    ```json
    {
      "user_id": "user123",
      "deleted_count": 15,
      "message": "All query history cleared successfully"
    }
    ```

    **Error Responses:**
    - 500: Database error
    """
    logger.info("Clearing all query history", extra={"user_id": user_id})

    try:
        deleted_count = await query_history_service.delete_all_user_queries(
            user_id=user_id
        )

        return {
            "user_id": user_id,
            "deleted_count": deleted_count,
            "message": "All query history cleared successfully",
        }

    except DatabaseQueryError:
        # 500 - already handled by exception handler
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error clearing history: {e}",
            extra={"user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred.",
            },
        )


@router.put("/{query_id}/save", response_model=QueryHistory)
async def save_query(
    query_id: int = Path(..., description="Query ID to save", ge=1),
    user_id: str = Query(
        ..., description="User ID for ownership validation", min_length=1
    ),
    query_name: str = Query(
        ..., description="Name for the saved query", min_length=1, max_length=255
    ),
):
    """
    Save/bookmark a query with a custom name.

    Sets is_saved = TRUE and assigns a query_name.

    **Path Parameters:**
    - `query_id`: ID of query to save

    **Query Parameters:**
    - `user_id`: User ID (for ownership validation)
    - `query_name`: Custom name for the saved query (1-255 chars)

    **Example Request:**
    ```
    PUT /history/42/save?user_id=user123&query_name=Weekly%20FX%20Report
    ```

    **Success Response:**
    ```json
    {
      "query_id": 42,
      "user_id": "user123",
      "query_text": "show me pending FX trades",
      "is_saved": true,
      "query_name": "Weekly FX Report",
      "create_time": "2026-02-01T10:30:00Z",
      "last_use_time": "2026-02-05T14:22:00Z"
    }
    ```

    **Error Responses:**
    - 404: Query not found
    - 403: User doesn't own this query
    - 500: Database error
    """
    logger.info(
        "Saving query",
        extra={"query_id": query_id, "user_id": user_id, "query_name": query_name},
    )

    try:
        updated_query = await query_history_service.update_query(
            query_id=query_id, user_id=user_id, is_saved=True, query_name=query_name
        )

        return updated_query

    except QueryHistoryNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error": "query_not_found", "message": str(e)},
        )

    except UnauthorizedAccessError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "error": "unauthorized", "message": str(e)},
        )

    except DatabaseQueryError:
        raise

    except Exception as e:
        logger.error(
            f"Unexpected error saving query: {e}",
            extra={"query_id": query_id, "user_id": user_id},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "internal_error",
                "message": "An unexpected error occurred.",
            },
        )


@router.put("/{query_id}/use", status_code=status.HTTP_200_OK)
async def use_query(
    query_id: int = Path(..., description="Query ID to mark as used", ge=1),
    user_id: str = Query(
        ..., description="User ID for ownership validation", min_length=1
    ),
):
    """
    Update last_use_time for a query.

    Called when user re-runs a saved query or clicks on history.

    **Path Parameters:**
    - `query_id`: ID of query to update

    **Query Parameters:**
    - `user_id`: User ID (for ownership validation)

    **Example Request:**
    ```
    PUT /history/42/use?user_id=user123
    ```

    **Success Response:**
    ```json
    {
      "success": true,
      "message": "Query last_use_time updated"
    }
    ```
    """
    logger.debug(
        "Updating query last_use_time", extra={"query_id": query_id, "user_id": user_id}
    )

    try:
        await query_history_service.update_last_use_time(
            query_id=query_id, user_id=user_id
        )

        return {"success": True, "message": "Query last_use_time updated"}

    except Exception as e:
        logger.warning(
            f"Failed to update last_use_time: {e}",
            extra={"query_id": query_id, "user_id": user_id},
        )
        # Non-critical - return success anyway
        return {
            "success": True,
            "message": "Query last_use_time updated (with warnings)",
        }
