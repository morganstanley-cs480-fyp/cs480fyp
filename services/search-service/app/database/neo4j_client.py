"""
Async Neo4j client for knowledge graph queries within search-service.

Mirrors the pattern used by trade-flow-service and graph-maker-service,
both of which connect to the same Neo4j EC2 instance via the Bolt protocol.
Connection is optional — if NEO4J_URI is not configured the client is a
no-op and all queries return empty results, keeping KG features disabled
without crashing the service.
"""

from typing import Any

from neo4j import AsyncGraphDatabase
from neo4j.time import Date, DateTime

from app.config.settings import settings
from app.utils.logger import logger


def _serialize(data: Any) -> Any:
    """Recursively convert Neo4j temporal types to JSON-safe strings."""
    if isinstance(data, list):
        return [_serialize(item) for item in data]
    if isinstance(data, dict):
        return {k: _serialize(v) for k, v in data.items()}
    if isinstance(data, (DateTime, Date)):
        return data.iso_format()
    return data


class Neo4jClient:
    """Async Neo4j client wrapper.  auth=None matches the Docker run used on EC2."""

    def __init__(self) -> None:
        self.driver = None

    async def connect(self) -> None:
        """Open the driver and verify the connection.  Safe to call if URI is absent."""
        if not settings.NEO4J_URI:
            logger.info("NEO4J_URI not configured – KG features disabled")
            return
        try:
            self.driver = AsyncGraphDatabase.driver(settings.NEO4J_URI, auth=None)
            async with self.driver.session() as session:
                await session.run("RETURN 1")
            logger.info("Neo4j connected", extra={"uri": settings.NEO4J_URI})
        except Exception as exc:
            logger.warning(
                "Neo4j connection failed – KG features will be disabled",
                extra={"error": str(exc)},
            )
            self.driver = None

    async def execute(self, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """Run a read query and return cleaned rows.  Returns [] if not connected."""
        if not self.driver:
            return []
        try:
            async with self.driver.session() as session:
                return await session.execute_read(self._run_query, query, params or {})
        except Exception as exc:
            logger.warning("Neo4j query failed", extra={"error": str(exc)})
            return []

    @staticmethod
    async def _run_query(tx, query: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        result = await tx.run(query, params)
        records = await result.data()
        return _serialize(records)

    async def close(self) -> None:
        if self.driver:
            await self.driver.close()
            self.driver = None
            logger.info("Neo4j connection closed")


# Module-level singleton — connect() is called in app lifespan (main.py)
neo4j_client = Neo4jClient()
