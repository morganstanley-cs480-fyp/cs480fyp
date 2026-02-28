"""
Search Service - Main Application
AI-powered trade search service with natural language and manual filter support.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.database.connection import db_manager
from app.cache.redis_client import redis_manager
from app.utils.logger import logger
from app.utils.exceptions import (
    SearchServiceException,
    DatabaseConnectionError,
    DatabaseQueryError,
    CacheConnectionError,
    CacheOperationError,
    BedrockAPIError,
    BedrockResponseError,
    InvalidSearchRequestError,
    QueryHistoryNotFoundError,
    UnauthorizedAccessError,
    ValidationError,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle - startup and shutdown events.
    Ensures database and cache connections are properly managed.
    """
    # Startup
    logger.info(
        "Starting search-service",
        extra={
            "version": settings.VERSION,
            "environment": "local" if settings.LOG_LEVEL == "DEBUG" else "production",
        },
    )

    try:
        # Initialize database connection pool
        await db_manager.connect()
        logger.info("Database connection pool initialized successfully")

        # Ensure required tables exist (idempotent - safe to run on every startup)
        await db_manager.pool.execute("""
            CREATE TABLE IF NOT EXISTS query_history (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                query_text TEXT NOT NULL,
                is_saved BOOLEAN DEFAULT FALSE,
                query_name VARCHAR(255),
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_use_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT chk_query_name_when_saved
                    CHECK ((is_saved = FALSE AND query_name IS NULL) OR is_saved = TRUE)
            );
            CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_query_history_last_use_time ON query_history(last_use_time DESC);
            CREATE INDEX IF NOT EXISTS idx_query_history_is_saved ON query_history(is_saved);
            CREATE INDEX IF NOT EXISTS idx_query_history_user_saved ON query_history(user_id, is_saved);
        """)
        logger.info("Database tables verified/created successfully")

        # Initialize Redis cache connection
        await redis_manager.connect()
        logger.info("Redis cache connection initialized successfully")

        # Verify connections with health checks
        db_healthy = await db_manager.health_check()
        redis_healthy = await redis_manager.health_check()

        if not db_healthy:
            logger.error("Database health check failed on startup")
            raise DatabaseConnectionError("Database is not healthy")

        if not redis_healthy:
            logger.warning(
                "Redis health check failed on startup - continuing without cache"
            )

        logger.info("Search service startup completed successfully")

    except Exception as e:
        logger.error(f"Failed to start search service: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down search-service")

    try:
        await redis_manager.disconnect()
        logger.info("Redis cache connection closed")

        await db_manager.disconnect()
        logger.info("Database connection pool closed")

        logger.info("Search service shutdown completed successfully")

    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Initialize FastAPI application
app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.VERSION,
    description="AI-powered trade search service using natural language queries and manual filters",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# Configure CORS middleware
if settings.ENABLE_CORS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS enabled for origins: {settings.CORS_ORIGINS}")


# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================


@app.exception_handler(InvalidSearchRequestError)
async def invalid_search_request_handler(
    request: Request, exc: InvalidSearchRequestError
):
    """Handle invalid search request errors (400 Bad Request)"""
    logger.warning(
        f"Invalid search request: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": "Invalid request",
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle validation errors (422 Unprocessable Entity)"""
    logger.warning(
        f"Validation error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Validation failed",
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(QueryHistoryNotFoundError)
async def query_not_found_handler(request: Request, exc: QueryHistoryNotFoundError):
    """Handle query history not found errors (404 Not Found)"""
    logger.warning(
        f"Query history not found: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "success": False,
            "error": "Not found",
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(UnauthorizedAccessError)
async def unauthorized_access_handler(request: Request, exc: UnauthorizedAccessError):
    """Handle unauthorized access errors (403 Forbidden)"""
    logger.warning(
        f"Unauthorized access attempt: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={
            "success": False,
            "error": "Forbidden",
            "message": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(BedrockAPIError)
async def bedrock_api_error_handler(request: Request, exc: BedrockAPIError):
    """Handle Bedrock API errors (502 Bad Gateway)"""
    logger.error(
        f"Bedrock API error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "success": False,
            "error": "AI service unavailable",
            "message": "The AI parameter extraction service is currently unavailable. Please try again later or use manual search.",
            "details": exc.details if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


@app.exception_handler(BedrockResponseError)
async def bedrock_response_error_handler(request: Request, exc: BedrockResponseError):
    """Handle Bedrock response parsing errors (422 Unprocessable Entity)"""
    logger.error(
        f"Bedrock response error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "AI response error",
            "message": "Unable to understand the AI response. Please rephrase your query or use manual search.",
            "details": exc.details if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


@app.exception_handler(DatabaseConnectionError)
async def database_connection_error_handler(
    request: Request, exc: DatabaseConnectionError
):
    """Handle database connection errors (503 Service Unavailable)"""
    logger.error(
        f"Database connection error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "success": False,
            "error": "Database unavailable",
            "message": "The database service is currently unavailable. Please try again later.",
            "details": exc.details if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


@app.exception_handler(DatabaseQueryError)
async def database_query_error_handler(request: Request, exc: DatabaseQueryError):
    """Handle database query errors (500 Internal Server Error)"""
    logger.error(
        f"Database query error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Query execution failed",
            "message": "An error occurred while executing the search query. Please try again.",
            "details": exc.details if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


@app.exception_handler(CacheConnectionError)
async def cache_connection_error_handler(request: Request, exc: CacheConnectionError):
    """Handle cache connection errors (non-critical, log and continue)"""
    logger.warning(
        f"Cache connection error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    # Cache errors should not fail the request - we can continue without cache
    # This error should be caught by services and handled gracefully
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Cache service error",
            "message": "Cache service is unavailable, but search should still work.",
        },
    )


@app.exception_handler(CacheOperationError)
async def cache_operation_error_handler(request: Request, exc: CacheOperationError):
    """Handle cache operation errors (non-critical, log and continue)"""
    logger.warning(
        f"Cache operation error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    # Cache errors should not fail the request
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Cache operation error",
            "message": "Cache operation failed, but search should still work.",
        },
    )


@app.exception_handler(SearchServiceException)
async def generic_search_exception_handler(
    request: Request, exc: SearchServiceException
):
    """Handle all other SearchServiceException instances (500 Internal Server Error)"""
    logger.error(
        f"Search service error: {exc.message}",
        extra={"path": request.url.path, "details": exc.details},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "message": exc.message,
            "details": exc.details if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions (500 Internal Server Error)"""
    logger.error(
        f"Uncaught exception: {str(exc)}",
        extra={"path": request.url.path, "exception_type": type(exc).__name__},
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "details": str(exc) if settings.LOG_LEVEL == "DEBUG" else None,
        },
    )


# ============================================================================
# INCLUDE ROUTERS
# ============================================================================

# Import routers (will be created in subsequent tasks)
# These imports are at the bottom to avoid circular dependencies
# pylint: disable=wrong-import-position
from app.api.routes.health import router as health_router  # noqa: E402
from app.api.routes.search import router as search_router  # noqa: E402
from app.api.routes.history import router as history_router  # noqa: E402
from app.api.routes.filters import router as filters_router  # noqa: E402

# Register routers
app.include_router(health_router)
app.include_router(search_router)
app.include_router(history_router)
app.include_router(filters_router)

logger.info(
    "API routes registered",
    extra={
        "routes": [
            "GET /",
            "GET /health",
            "POST /api/search",
            "GET /api/history",
            "GET /api/history/suggestions",
            "PUT /api/history/{query_id}",
            "DELETE /api/history/{query_id}",
            "GET /api/filter-options",
        ]
    },
)
