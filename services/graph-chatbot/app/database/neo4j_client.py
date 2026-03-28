import logging
import os
from neo4j import AsyncGraphDatabase
from neo4j.time import DateTime, Date
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

def serialize_neo4j_types(data: Any) -> Any:
    """Recursively converts Neo4j types to JSON-serializable strings."""
    if isinstance(data, list):
        return [serialize_neo4j_types(item) for item in data]
    if isinstance(data, dict):
        return {k: serialize_neo4j_types(v) for k, v in data.items()}
    if isinstance(data, (DateTime, Date)):
        return data.iso_format()
    return data

class Neo4jClient:
    """Async Neo4j client wrapper for EC2 Docker (NEO4J_AUTH=none)"""
    
    # We only need the URI now, no user/password required
    def __init__(self, uri: str):
        self.uri = uri
        self.driver = None
    
    async def connect(self):
        try:
            # auth=None maps perfectly to your Docker run command
            self.driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=None 
            )
            
            # Test connection
            async with self.driver.session() as session:
                await session.run("RETURN 1")
                
            logger.info(f"Successfully connected to Neo4j at {self.uri}")
            
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise
    
    async def execute_query(
        self,
        query: str,
        parameters: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """Execute a read query and return sanitized results."""
        if not self.driver:
            await self.connect()
        
        try:
            async with self.driver.session() as session:
                result = await session.execute_read(
                    self._run_query,
                    query,
                    parameters or {}
                )
                return result
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise

    async def run(self, query: str, parameters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Alias for execute_query for backward compatibility."""
        return await self.execute_query(query, parameters)

    async def _run_query(self, tx, query: str, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Internal method to run query and clean data types."""
        result = await tx.run(query, parameters)
        records = await result.data()
        return serialize_neo4j_types(records)

    async def close(self):
        if self.driver:
            await self.driver.close()
            logger.info("Neo4j connection closed")