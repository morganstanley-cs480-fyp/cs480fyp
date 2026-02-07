"""
Document routes for storing and retrieving embeddings.
"""
from typing import List, Dict, Any

from fastapi import APIRouter, Request
from pydantic import BaseModel


router = APIRouter(prefix="/documents", tags=["documents"])


class Document(BaseModel):
    """Document with text and optional metadata."""
    text: str
    metadata: Dict[str, Any] = {}


class DocumentWithEmbedding(Document):
    """Document with its embedding vector."""
    embedding: List[float]


class SearchQuery(BaseModel):
    """Search query with embedding vector."""
    embedding: List[float]
    limit: int = 5


@router.post("/store")
async def store_documents(request: Request, documents: List[DocumentWithEmbedding]) -> List[int]:
    """
    Store documents with their embeddings in the vector store.
    
    Args:
        documents: List of documents with their embeddings
        
    Returns:
        List of document IDs
    """
    texts = [doc.text for doc in documents]
    embeddings = [doc.embedding for doc in documents]
    metadata = [doc.metadata for doc in documents]
    
    return request.app.state.vector_store.add_documents(
        texts=texts,
        embeddings=embeddings,
        metadata=metadata
    )


@router.post("/search")
async def search_documents(request: Request, query: SearchQuery) -> List[Dict[str, Any]]:
    """
    Search for similar documents using a query embedding.
    
    Args:
        query: Search query with embedding vector
        
    Returns:
        List of similar documents with scores
    """
    return request.app.state.vector_store.search(
        query_embedding=query.embedding,
        limit=query.limit
    )