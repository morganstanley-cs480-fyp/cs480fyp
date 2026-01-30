"""
Health Check Routes
Provides health and readiness endpoints for ECS monitoring and load balancers.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, status

from app.config.settings import settings
from app.database.connection import db_manager
from app.cache.redis_client import redis_manager
from app.utils.logger import logger


router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    """
    Root endpoint - basic service information.
    Used for quick connectivity checks.
    """
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "status": "running",
        "description": "AI-powered trade search service"
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for ECS/ALB target group health checks.
    
    Returns 200 OK if service is healthy and can handle traffic.
    Returns 503 Service Unavailable if critical dependencies are down.
    
    This endpoint is called frequently by load balancers, so it should be:
    - Fast (< 100ms)
    - Lightweight (minimal resource usage)
    - Critical checks only (database required, cache optional)
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "checks": {}
    }
    
    is_healthy = True
    
    # Check database connectivity (CRITICAL - required for service to function)
    try:
        db_healthy = await db_manager.health_check()
        health_status["checks"]["database"] = {
            "status": "ok" if db_healthy else "failed",
            "required": True
        }
        
        if not db_healthy:
            is_healthy = False
            logger.error("Database health check failed")
            
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "error",
            "required": True,
            "error": str(e)
        }
        is_healthy = False
        logger.error(f"Database health check exception: {e}")
    
    # Check Redis cache connectivity (NON-CRITICAL - service can function without cache)
    try:
        redis_healthy = await redis_manager.health_check()
        health_status["checks"]["cache"] = {
            "status": "ok" if redis_healthy else "degraded",
            "required": False
        }
        
        if not redis_healthy:
            logger.warning("Redis health check failed - service will continue without cache")
            
    except Exception as e:
        health_status["checks"]["cache"] = {
            "status": "degraded",
            "required": False,
            "error": str(e)
        }
        logger.warning(f"Redis health check exception: {e}")
    
    # Set overall status
    if not is_healthy:
        health_status["status"] = "unhealthy"
        
        # Log unhealthy state for monitoring
        logger.error(
            "Health check failed",
            extra={
                "checks": health_status["checks"],
                "timestamp": health_status["timestamp"]
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=health_status
        )
    
    # Service is healthy - check if running in degraded mode (cache down)
    if health_status["checks"].get("cache", {}).get("status") != "ok":
        health_status["status"] = "degraded"
        logger.info("Health check passed but service is degraded (cache unavailable)")
    
    return health_status


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check endpoint for Kubernetes/ECS readiness probes.
    
    Similar to /health but may include additional checks for:
    - Warm-up status
    - Connection pool readiness
    - Background task completion
    
    Returns 200 OK if service is ready to accept traffic.
    Returns 503 Service Unavailable if service is starting up or shutting down.
    """
    readiness_status = {
        "ready": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.SERVICE_NAME,
        "checks": {}
    }
    
    is_ready = True
    
    # Check if database pool is initialized and has connections available
    try:
        if db_manager._pool is None:
            readiness_status["checks"]["database"] = {
                "ready": False,
                "reason": "Connection pool not initialized"
            }
            is_ready = False
        else:
            # Verify pool is functional with a simple query
            db_healthy = await db_manager.health_check()
            readiness_status["checks"]["database"] = {
                "ready": db_healthy,
                "pool_size": f"{db_manager._pool.get_size()}/{db_manager._pool.get_max_size()}"
            }
            
            if not db_healthy:
                is_ready = False
                
    except Exception as e:
        readiness_status["checks"]["database"] = {
            "ready": False,
            "error": str(e)
        }
        is_ready = False
    
    # Check if Redis client is initialized (optional)
    try:
        if redis_manager._client is None:
            readiness_status["checks"]["cache"] = {
                "ready": False,
                "reason": "Redis client not initialized"
            }
        else:
            redis_healthy = await redis_manager.health_check()
            readiness_status["checks"]["cache"] = {
                "ready": redis_healthy
            }
            
    except Exception as e:
        readiness_status["checks"]["cache"] = {
            "ready": False,
            "error": str(e)
        }
    
    if not is_ready:
        readiness_status["ready"] = False
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=readiness_status
        )
    
    return readiness_status


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint for Kubernetes/ECS liveness probes.
    
    This is a simple check that the application process is running.
    It should NOT check external dependencies (database, cache, etc.).
    
    If this endpoint fails, the container should be restarted.
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION
    }
