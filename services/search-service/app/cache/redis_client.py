"""
Redis cache client for caching search results and AI extractions.
Provides connection management and common cache operations.
"""

from typing import Optional, Any
import json
import hashlib

import redis.asyncio as redis

from app.config.settings import settings
from app.utils.logger import logger
from app.utils.exceptions import CacheConnectionError, CacheOperationError


class RedisManager:
    """Manages Redis connection and cache operations"""

    def __init__(self):
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """
        Initialize Redis connection.
        Called during application startup.
        """
        try:
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=settings.REDIS_DECODE_RESPONSES,
                socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
            )

            # Test connection
            await self._client.ping()

            logger.info(
                "Redis connection established",
                extra={
                    "host": settings.REDIS_HOST,
                    "port": settings.REDIS_PORT,
                    "db": settings.REDIS_DB,
                },
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise CacheConnectionError(
                "Failed to connect to Redis",
                details={"error": str(e), "host": settings.REDIS_HOST},
            )

    async def disconnect(self) -> None:
        """
        Close Redis connection.
        Called during application shutdown.
        """
        if self._client:
            await self._client.close()
            logger.info("Redis connection closed")
            self._client = None

    @property
    def client(self) -> redis.Redis:
        """Get Redis client instance"""
        if self._client is None:
            raise CacheConnectionError("Redis client not initialized")
        return self._client

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON) or None if not found
        """
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to decode cached value for key {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}", extra={"key": key})
            raise CacheOperationError(
                "Failed to get value from cache", details={"error": str(e), "key": key}
            )

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be serialized to JSON)
            ttl: Time to live in seconds (optional)

        Returns:
            True if successful, False otherwise
        """
        try:
            serialized = json.dumps(value)
            if ttl:
                await self.client.setex(key, ttl, serialized)
            else:
                await self.client.set(key, serialized)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}", extra={"key": key})
            raise CacheOperationError(
                "Failed to set value in cache", details={"error": str(e), "key": key}
            )

    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if key was deleted, False if key didn't exist
        """
        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete error: {e}", extra={"key": key})
            raise CacheOperationError(
                "Failed to delete value from cache",
                details={"error": str(e), "key": key},
            )

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        try:
            result = await self.client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Cache exists error: {e}", extra={"key": key})
            raise CacheOperationError(
                "Failed to check key existence in cache",
                details={"error": str(e), "key": key},
            )

    async def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Key pattern (e.g., "search:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                return await self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache clear pattern error: {e}", extra={"pattern": pattern})
            raise CacheOperationError(
                "Failed to clear cache pattern",
                details={"error": str(e), "pattern": pattern},
            )

    async def health_check(self) -> bool:
        """
        Check if Redis connection is healthy.
        Used by health endpoint.

        Returns:
            True if healthy, False otherwise
        """
        try:
            await self.client.ping()
            return True
        except (redis.RedisError, redis.ConnectionError) as e:
            logger.error(f"Redis health check failed: {e}")
            return False


# Cache key builders
class CacheKeys:
    """Helper class for building cache keys with consistent naming"""

    @staticmethod
    def ai_extraction(query_text: str) -> str:
        """Cache key for AI extraction results"""
        query_hash = hashlib.md5(query_text.encode()).hexdigest()
        return f"ai:extraction:{query_hash}"

    @staticmethod
    def search_results(user_id: str, query_hash: str) -> str:
        """Cache key for search results"""
        return f"search:results:{user_id}:{query_hash}"

    @staticmethod
    def query_history(user_id: str) -> str:
        """Cache key for user's query history"""
        return f"history:{user_id}"

    @staticmethod
    def common_queries() -> str:
        """Cache key for popular/common queries"""
        return "common:queries"


# Global Redis manager instance
redis_manager = RedisManager()


# Convenience functions for dependency injection
async def get_redis_manager() -> RedisManager:
    """Dependency injection helper for FastAPI"""
    return redis_manager
