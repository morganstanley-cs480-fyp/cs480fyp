"""
RAG pipeline orchestration.

Modules:
- vector_db: Milvus vector database client for embedding storage and retrieval
- embeddings: Mock embedding generation utilities
"""

from app.services.vector_db import MilvusVectorDB, get_vector_db
from app.services.embeddings import (
    generate_mock_embedding,
    generate_mock_embeddings,
    SAMPLE_DOCUMENTS,
)

__all__ = [
    "MilvusVectorDB",
    "get_vector_db",
    "generate_mock_embedding",
    "generate_mock_embeddings",
    "SAMPLE_DOCUMENTS",
]
