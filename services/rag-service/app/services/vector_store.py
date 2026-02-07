"""
Vector store service using Milvus for storing and retrieving embeddings.
"""
from typing import List, Optional, Dict, Any

from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
)

from app.config.settings import settings


class MilvusVectorStore:
    """Milvus vector store for document embeddings."""

    def __init__(self):
        """Initialize Milvus connection and collection."""
        self.host = settings.MILVUS_HOST
        self.port = settings.MILVUS_PORT
        self.collection_name = settings.MILVUS_COLLECTION
        self.dim = settings.VECTOR_DIM
        self._collection: Optional[Collection] = None

    def connect(self) -> None:
        """Establish connection to Milvus server."""
        connections.connect(
            alias="default",
            host=self.host,
            port=self.port,
        )

    def initialize(self) -> None:
        """Initialize the collection if it doesn't exist."""
        if utility.has_collection(self.collection_name):
            self._collection = Collection(self.collection_name)
            self._collection.load()
            return

        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="metadata", dtype=DataType.JSON),
            FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.dim)
        ]
        schema = CollectionSchema(fields=fields, description="Document embeddings")
        self._collection = Collection(self.collection_name, schema)
        
        # Create index for vector field
        index_params = {
            "metric_type": "COSINE",
            "index_type": "IVF_FLAT",
            "params": {"nlist": 1024}
        }
        self._collection.create_index("vector", index_params)
        self._collection.load()

    def add_documents(
        self, texts: List[str], embeddings: List[List[float]], metadata: List[Dict[str, Any]] = None
    ) -> List[int]:
        """
        Add documents and their embeddings to the vector store.
        
        Args:
            texts: List of document texts
            embeddings: List of document embeddings
            metadata: Optional list of metadata dicts for each document
            
        Returns:
            List of document IDs
        """
        if metadata is None:
            metadata = [{} for _ in texts]
            
        entities = [
            {"text": text, "vector": embedding, "metadata": meta}
            for text, embedding, meta in zip(texts, embeddings, metadata)
        ]
        
        insert_result = self._collection.insert(entities)
        self._collection.flush()
        return insert_result.primary_keys

    def search(
        self, query_embedding: List[float], limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using a query embedding.
        
        Args:
            query_embedding: Query vector to search with
            limit: Maximum number of results to return
            
        Returns:
            List of documents with their similarity scores
        """
        search_params = {
            "metric_type": "COSINE",
            "params": {"nprobe": 10},
        }
        
        results = self._collection.search(
            data=[query_embedding],
            anns_field="vector",
            param=search_params,
            limit=limit,
            output_fields=["text", "metadata"]
        )

        hits = []
        for hit in results[0]:
            hits.append({
                "id": hit.id,
                "text": hit.entity.get("text"),
                "metadata": hit.entity.get("metadata"),
                "score": hit.score
            })
            
        return hits

    def close(self) -> None:
        """Close Milvus connection."""
        connections.disconnect("default")