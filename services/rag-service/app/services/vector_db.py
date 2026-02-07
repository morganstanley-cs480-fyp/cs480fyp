"""
Milvus Vector Database Service.

Handles connection, collection management, and CRUD operations for vector embeddings.
"""

import logging
from typing import List, Dict, Any, Optional

import numpy as np
from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
)

from app.config.settings import settings

logger = logging.getLogger(__name__)


class MilvusVectorDB:
    """Milvus vector database client for embedding storage and retrieval."""

    def __init__(self):
        """Initialize Milvus connection settings."""
        self.host = settings.MILVUS_HOST
        self.port = settings.MILVUS_PORT
        self.collection_name = settings.MILVUS_COLLECTION_NAME
        self.dimension = settings.MILVUS_DIMENSION
        self.collection: Optional[Collection] = None
        self._connected = False

    def connect(self) -> None:
        """Establish connection to Milvus server."""
        try:
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port,
                user=settings.MILVUS_USER if settings.MILVUS_USER else None,
                password=settings.MILVUS_PASSWORD if settings.MILVUS_PASSWORD else None,
            )
            self._connected = True
            logger.info(f"Connected to Milvus at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Milvus: {e}")
            raise

    def disconnect(self) -> None:
        """Disconnect from Milvus server."""
        if self._connected:
            connections.disconnect("default")
            self._connected = False
            logger.info("Disconnected from Milvus")

    def create_collection(self, drop_existing: bool = False) -> None:
        """
        Create a collection for storing document embeddings.

        Args:
            drop_existing: If True, drop existing collection before creating new one.
        """
        if not self._connected:
            self.connect()

        # Drop existing collection if requested
        if drop_existing and utility.has_collection(self.collection_name):
            utility.drop_collection(self.collection_name)
            logger.info(f"Dropped existing collection: {self.collection_name}")

        # Check if collection already exists
        if utility.has_collection(self.collection_name):
            self.collection = Collection(self.collection_name)
            logger.info(f"Using existing collection: {self.collection_name}")
            return

        # Define collection schema
        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(
                name="embedding",
                dtype=DataType.FLOAT_VECTOR,
                dim=self.dimension,
            ),
            FieldSchema(name="metadata", dtype=DataType.JSON),
        ]
        schema = CollectionSchema(
            fields=fields, description="RAG document embeddings collection"
        )

        # Create collection
        self.collection = Collection(
            name=self.collection_name, schema=schema, using="default"
        )
        logger.info(f"Created collection: {self.collection_name}")

        # Create index for vector search
        index_params = {
            "index_type": "IVF_FLAT",
            "metric_type": "L2",
            "params": {"nlist": 128},
        }
        self.collection.create_index(field_name="embedding", index_params=index_params)
        logger.info("Created index on embedding field")

    def insert_embeddings(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[int]:
        """
        Insert text embeddings into the collection.

        Args:
            texts: List of text strings
            embeddings: List of embedding vectors
            metadata: Optional list of metadata dictionaries

        Returns:
            List of inserted document IDs
        """
        if not self._connected:
            self.connect()

        if self.collection is None:
            self.create_collection()

        # Prepare metadata
        if metadata is None:
            metadata = [{}] * len(texts)

        # Prepare data for insertion
        data = [
            texts,
            embeddings,
            metadata,
        ]

        # Insert data
        insert_result = self.collection.insert(data)
        self.collection.flush()
        logger.info(f"Inserted {len(texts)} documents")

        return insert_result.primary_keys

    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        output_fields: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar embeddings using vector similarity.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of similar results to return
            output_fields: Fields to include in results

        Returns:
            List of search results with text, metadata, and similarity scores
        """
        if not self._connected:
            self.connect()

        if self.collection is None:
            self.create_collection()

        # Load collection into memory for search
        self.collection.load()

        # Set default output fields
        if output_fields is None:
            output_fields = ["text", "metadata"]

        # Define search parameters
        search_params = {
            "metric_type": "L2",
            "params": {"nprobe": 10},
        }

        # Perform search
        results = self.collection.search(
            data=[query_embedding],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=output_fields,
        )

        # Format results
        formatted_results = []
        for hits in results:
            for hit in hits:
                result = {
                    "id": hit.id,
                    "distance": hit.distance,
                    "text": hit.entity.get("text"),
                    "metadata": hit.entity.get("metadata", {}),
                }
                formatted_results.append(result)

        logger.info(f"Found {len(formatted_results)} similar documents")
        return formatted_results

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection.

        Returns:
            Dictionary with collection statistics
        """
        if not self._connected:
            self.connect()

        if self.collection is None:
            return {"exists": False}

        self.collection.load()
        num_entities = self.collection.num_entities

        return {
            "exists": True,
            "name": self.collection_name,
            "num_entities": num_entities,
            "dimension": self.dimension,
        }


# Singleton instance
_vector_db_instance: Optional[MilvusVectorDB] = None


def get_vector_db() -> MilvusVectorDB:
    """Get or create the vector database singleton instance."""
    global _vector_db_instance
    if _vector_db_instance is None:
        _vector_db_instance = MilvusVectorDB()
    return _vector_db_instance
