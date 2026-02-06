"""
Query History API Routes
GET /history, PUT /history/{query_id}, DELETE /history/{query_id}
"""

from fastapi import APIRouter, HTTPException, Query, Path, status

from app.models.request import UpdateHistoryRequest
from app.models.domain import QueryHistory
from app.services.query_history_service import query_history_service
from app.utils.logger import logger
from app.utils.exceptions import (
    QueryHistoryNotFoundError,
    UnauthorizedAccessError,
    DatabaseQueryError
)


router = APIRouter(prefix="/history", tags=["history"])


@router.get("/", response_model=list[QueryHistory])
async def get_history(
    user_id: str = Query(..., description="User ID to fetch history for", min_length=1),
    limit: int = Query(50, description="Maximum number of records to return", ge=1, le=100),
    saved_only: bool = Query(False, description="Return only saved/bookmarked queries")
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
        extra={
            "user_id": user_id,
            "limit": limit,
            "saved_only": saved_only
        }
    )
    
    try:
        history_list = await query_history_service.get_user_history(
            user_id=user_id,
            limit=limit,
            saved_only=saved_only
        )
        
        return history_list
        
    except DatabaseQueryError as e:
        logger.error(
            f"Failed to fetch query history: {e.message}",
            extra={"user_id": user_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Database error",
                "message": "Failed to retrieve query history."
            }
        )
    
    except Exception as e:
        logger.error(
            f"Unexpected error fetching history: {e}",
            extra={"user_id": user_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred."
            }
        )


@router.put("/{query_id}", response_model=QueryHistory)
async def update_history(
    query_id: int = Path(..., description="Query ID to update", ge=1),
    user_id: str = Query(..., description="User ID (for ownership validation)", min_length=1),
    update: UpdateHistoryRequest = ...
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
        extra={
            "query_id": query_id,
            "user_id": user_id,
            "is_saved": update.is_saved
        }
    )
    
    try:
        updated_history = await query_history_service.update_query(
            query_id=query_id,
            user_id=user_id,
            is_saved=update.is_saved,
            query_name=update.query_name
        )
        
        return updated_history
        
    except QueryHistoryNotFoundError as e:  # pylint: disable=unused-variable
        # 404 - already handled by exception handler
        raise
        
    except UnauthorizedAccessError as e:
        # 403 - already handled by exception handler
        raise
        
    except DatabaseQueryError as e:
        # 500 - already handled by exception handler
        raise
        
    except Exception as e:
        logger.error(
            f"Unexpected error updating history: {e}",
            extra={"query_id": query_id, "user_id": user_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred."
            }
        )


@router.delete("/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history(
    query_id: int = Path(..., description="Query ID to delete", ge=1),
    user_id: str = Query(..., description="User ID (for ownership validation)", min_length=1)
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
        "Deleting query history",
        extra={"query_id": query_id, "user_id": user_id}
    )
    
    try:
        await query_history_service.delete_query(
            query_id=query_id,
            user_id=user_id
        )
        
        # Return 204 No Content (no body)
        return None
        
    except QueryHistoryNotFoundError as e:  # pylint: disable=unused-variable
        # 404 - already handled by exception handler
        raise
        
    except UnauthorizedAccessError as e:
        # 403 - already handled by exception handler
        raise
        
    except DatabaseQueryError as e:
        # 500 - already handled by exception handler
        raise
        
    except Exception as e:
        logger.error(
            f"Unexpected error deleting history: {e}",
            extra={"query_id": query_id, "user_id": user_id},
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Internal server error",
                "message": "An unexpected error occurred."
            }
        )
