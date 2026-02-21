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
            user=settings.MILVUS_USER,  # For production auth
            password=settings.MILVUS_PASSWORD,  # For production auth
            secure=settings.MILVUS_SSL,  # Enable SSL in production
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

    def exists_by_exception_id(self, exception_id: str) -> bool:
        """
        Check if a document with the given exception_id already exists.
        
        Args:
            exception_id: The exception ID to check
            
        Returns:
            True if document exists, False otherwise
        """
        expr = f'metadata["exception_id"] == "{exception_id}"'
        results = self._collection.query(
            expr=expr,
            output_fields=["id"],
            limit=1
        )
        return len(results) > 0
    
    def get_document_by_exception_id(self, exception_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a document by its exception_id.
        
        Args:
            exception_id: The exception ID to search for
            
        Returns:
            Document dictionary with id, text, metadata, and vector, or None if not found
        """
        expr = f'metadata["exception_id"] == "{exception_id}"'
        results = self._collection.query(
            expr=expr,
            output_fields=["id", "text", "metadata", "vector"],
            limit=1
        )
        
        if not results:
            return None
        
        doc = results[0]
        return {
            "id": doc.get("id"),
            "text": doc.get("text"),
            "metadata": doc.get("metadata"),
            "vector": doc.get("vector")
        }
    
    def find_similar_by_exception_id(
        self, 
        exception_id: str, 
        limit: int = 3,
        exclude_self: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Find similar documents to the one with the given exception_id.
        
        Args:
            exception_id: The exception ID to find similar documents for
            limit: Maximum number of similar documents to return
            exclude_self: Whether to exclude the source document from results
            
        Returns:
            List of similar documents with similarity scores (0-100%)
            Each document contains: exception_id, trade_id, score, metadata
            
        Raises:
            ValueError: If document with exception_id not found
        """
        # Get the source document
        source_doc = self.get_document_by_exception_id(exception_id)
        if not source_doc:
            raise ValueError(f"Document with exception_id {exception_id} not found")
        
        # Search using its embedding
        search_limit = limit + 1 if exclude_self else limit
        results = self.search(source_doc["vector"], limit=search_limit)
        
        # Filter out the source document if requested
        if exclude_self:
            results = [r for r in results if r["metadata"].get("exception_id") != exception_id]
        
        # Format results with percentage scores
        similar_docs = []
        for result in results[:limit]:
            metadata = result["metadata"]
            # Convert cosine similarity (0-1) to percentage (0-100)
            similarity_percentage = round(result["score"] * 100, 2)
            
            similar_docs.append({
                "exception_id": metadata.get("exception_id"),
                "trade_id": metadata.get("trade_id"),
                "similarity_score": similarity_percentage,
                "priority": metadata.get("priority"),
                "status": metadata.get("status"),
                "asset_type": metadata.get("asset_type"),
                "clearing_house": metadata.get("clearing_house"),
                "exception_msg": metadata.get("exception_msg")
            })
        
        return similar_docs

    def close(self) -> None:
        """Close Milvus connection."""
        connections.disconnect("default")