"""
PostgreSQL database connection management using asyncpg.
Provides connection pooling for efficient resource usage.
"""

from typing import Optional
from contextlib import asynccontextmanager

import asyncpg

from app.config.settings import settings
from app.utils.logger import logger
from app.utils.exceptions import DatabaseConnectionError, DatabaseQueryError


class DatabaseManager:
    """Manages PostgreSQL connection pool"""
    
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """
        Initialize database connection pool.
        Called during application startup.
        """
        try:
            self._pool = await asyncpg.create_pool(
                host=settings.RDS_HOST,
                port=settings.RDS_PORT,
                database=settings.RDS_DB,
                user=settings.RDS_USER,
                password=settings.RDS_PASSWORD,
                min_size=settings.DB_POOL_MIN_SIZE,
                max_size=settings.DB_POOL_MAX_SIZE,
                command_timeout=settings.DB_COMMAND_TIMEOUT,
            )
            logger.info(
                "Database connection pool initialized",
                extra={
                    "host": settings.RDS_HOST,
                    "database": settings.RDS_DB,
                    "pool_size": f"{settings.DB_POOL_MIN_SIZE}-{settings.DB_POOL_MAX_SIZE}"
                }
            )
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise DatabaseConnectionError(
                "Failed to initialize database connection pool",
                details={"error": str(e), "host": settings.RDS_HOST}
            )
    
    async def disconnect(self) -> None:
        """
        Close database connection pool.
        Called during application shutdown.
        """
        if self._pool:
            await self._pool.close()
            logger.info("Database connection pool closed")
            self._pool = None

    async def close(self) -> None:
        """Alias for disconnect (for scripts)."""
        await self.disconnect()
    
    @property
    def pool(self) -> asyncpg.Pool:
        """Get connection pool instance"""
        if self._pool is None:
            raise DatabaseConnectionError("Database pool not initialized")
        return self._pool
    
    @asynccontextmanager
    async def acquire(self):
        """
        Context manager to acquire a connection from the pool.
        
        Usage:
            async with db_manager.acquire() as conn:
                result = await conn.fetch("SELECT * FROM trades")
        """
        if self._pool is None:
            raise DatabaseConnectionError("Database pool not initialized")
        
        async with self._pool.acquire() as connection:
            yield connection
    
    async def execute(self, query: str, *args) -> str:
        """
        Execute a query that doesn't return results (INSERT, UPDATE, DELETE).
        
        Args:
            query: SQL query string
            *args: Query parameters
        
        Returns:
            Query execution status
        """
        try:
            async with self.acquire() as conn:
                result = await conn.execute(query, *args)
                return result
        except Exception as e:
            logger.error(f"Database execute error: {e}", extra={"query": query})
            raise DatabaseQueryError(
                "Failed to execute database query",
                details={"error": str(e), "query": query}
            )
    
    async def fetch(self, query: str, *args) -> list[asyncpg.Record]:
        """
        Execute a query and fetch all results.
        
        Args:
            query: SQL query string
            *args: Query parameters
        
        Returns:
            List of database records
        """
        try:
            async with self.acquire() as conn:
                results = await conn.fetch(query, *args)
                return results
        except Exception as e:
            logger.error(f"Database fetch error: {e}", extra={"query": query})
            raise DatabaseQueryError(
                "Failed to fetch database results",
                details={"error": str(e), "query": query}
            )
    
    async def fetchrow(self, query: str, *args) -> Optional[asyncpg.Record]:
        """
        Execute a query and fetch one result.
        
        Args:
            query: SQL query string
            *args: Query parameters
        
        Returns:
            Single database record or None
        """
        try:
            async with self.acquire() as conn:
                result = await conn.fetchrow(query, *args)
                return result
        except Exception as e:
            logger.error(f"Database fetchrow error: {e}", extra={"query": query})
            raise DatabaseQueryError(
                "Failed to fetch database row",
                details={"error": str(e), "query": query}
            )
    
    async def fetchval(self, query: str, *args):
        """
        Execute a query and fetch a single value.
        
        Args:
            query: SQL query string
            *args: Query parameters
        
        Returns:
            Single value
        """
        try:
            async with self.acquire() as conn:
                result = await conn.fetchval(query, *args)
                return result
        except Exception as e:
            logger.error(f"Database fetchval error: {e}", extra={"query": query})
            raise DatabaseQueryError(
                "Failed to fetch database value",
                details={"error": str(e), "query": query}
            )
    
    async def health_check(self) -> bool:
        """
        Check if database connection is healthy.
        Used by health endpoint.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            await self.fetchval("SELECT 1")
            return True
        except asyncpg.PostgresError as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Global database manager instance
db_manager = DatabaseManager()


# Convenience functions for dependency injection
async def get_db_manager() -> DatabaseManager:
    """Dependency injection helper for FastAPI"""
    return db_manager
