"""
Mock embeddings generator for testing purposes.

In a real application, you would use a proper embedding model like:
- sentence-transformers
- OpenAI embeddings
- Hugging Face models
"""

import hashlib
from typing import List

import numpy as np

from app.config.settings import settings


def generate_mock_embedding(text: str, dimension: int = None) -> List[float]:
    """
    Generate a deterministic mock embedding from text using hashing.

    This is a simple mock implementation for testing. In production,
    use a proper embedding model.

    Args:
        text: Input text to embed
        dimension: Embedding dimension (defaults to settings.MILVUS_DIMENSION)

    Returns:
        List of floats representing the embedding vector
    """
    if dimension is None:
        dimension = settings.MILVUS_DIMENSION

    # Create a deterministic seed from text
    seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.RandomState(seed)

    # Generate random embedding
    embedding = rng.randn(dimension).astype(np.float32)

    # Normalize to unit length (common for embeddings)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm

    return embedding.tolist()


def generate_mock_embeddings(texts: List[str], dimension: int = None) -> List[List[float]]:
    """
    Generate mock embeddings for a list of texts.

    Args:
        texts: List of input texts
        dimension: Embedding dimension (defaults to settings.MILVUS_DIMENSION)

    Returns:
        List of embedding vectors
    """
    return [generate_mock_embedding(text, dimension) for text in texts]


# Sample documents for testing
SAMPLE_DOCUMENTS = [
    "Machine learning is a subset of artificial intelligence that focuses on learning from data.",
    "Deep learning uses neural networks with multiple layers to learn representations.",
    "Natural language processing enables computers to understand and generate human language.",
    "Vector databases are optimized for storing and searching high-dimensional embeddings.",
    "RAG (Retrieval-Augmented Generation) combines retrieval with language generation.",
    "Python is a popular programming language for data science and machine learning.",
    "FastAPI is a modern web framework for building APIs with Python.",
    "Milvus is an open-source vector database for AI applications.",
    "Embeddings represent text as dense vectors in a continuous space.",
    "Semantic search finds results based on meaning rather than exact keyword matches.",
]
