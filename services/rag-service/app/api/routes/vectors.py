"""
Vector database API routes for embedding insertion and retrieval.
"""

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.vector_db import get_vector_db
from app.services.embeddings import generate_mock_embedding, generate_mock_embeddings

router = APIRouter(prefix="/vectors", tags=["vectors"])


class InsertRequest(BaseModel):
    """Request model for inserting documents."""

    texts: List[str] = Field(..., description="List of text documents to embed and insert")
    metadata: Optional[List[Dict[str, Any]]] = Field(
        None, description="Optional metadata for each document"
    )


class InsertResponse(BaseModel):
    """Response model for insert operation."""

    inserted_ids: List[int] = Field(..., description="IDs of inserted documents")
    count: int = Field(..., description="Number of documents inserted")


class SearchRequest(BaseModel):
    """Request model for similarity search."""

    query_text: str = Field(..., description="Query text to search for")
    top_k: int = Field(5, ge=1, le=100, description="Number of results to return")


class SearchResult(BaseModel):
    """Single search result."""

    id: int = Field(..., description="Document ID")
    text: str = Field(..., description="Document text")
    distance: float = Field(..., description="Distance score (lower is more similar)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")


class SearchResponse(BaseModel):
    """Response model for search operation."""

    query: str = Field(..., description="Original query text")
    results: List[SearchResult] = Field(..., description="Search results")
    count: int = Field(..., description="Number of results returned")


class CollectionStats(BaseModel):
    """Collection statistics."""

    exists: bool = Field(..., description="Whether collection exists")
    name: Optional[str] = Field(None, description="Collection name")
    num_entities: Optional[int] = Field(None, description="Number of documents in collection")
    dimension: Optional[int] = Field(None, description="Embedding dimension")


@router.post("/insert", response_model=InsertResponse)
async def insert_documents(request: InsertRequest):
    """
    Insert documents into the vector database.

    This endpoint generates mock embeddings for the provided texts and inserts them
    into Milvus. In production, you would use a proper embedding model.
    """
    try:
        vector_db = get_vector_db()

        # Generate mock embeddings
        embeddings = generate_mock_embeddings(request.texts)

        # Insert into Milvus
        inserted_ids = vector_db.insert_embeddings(
            texts=request.texts,
            embeddings=embeddings,
            metadata=request.metadata,
        )

        return InsertResponse(
            inserted_ids=inserted_ids,
            count=len(inserted_ids),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert documents: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def search_similar_documents(request: SearchRequest):
    """
    Search for similar documents using semantic similarity.

    This endpoint generates a mock embedding for the query text and searches
    for the most similar documents in the vector database.
    """
    try:
        vector_db = get_vector_db()

        # Generate query embedding
        query_embedding = generate_mock_embedding(request.query_text)

        # Search for similar documents
        results = vector_db.search_similar(
            query_embedding=query_embedding,
            top_k=request.top_k,
        )

        # Format results
        search_results = [
            SearchResult(
                id=result["id"],
                text=result["text"],
                distance=result["distance"],
                metadata=result.get("metadata", {}),
            )
            for result in results
        ]

        return SearchResponse(
            query=request.query_text,
            results=search_results,
            count=len(search_results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search documents: {str(e)}")


@router.get("/collection/stats", response_model=CollectionStats)
async def get_collection_statistics():
    """
    Get statistics about the vector database collection.

    Returns information about the collection including number of documents
    and configuration.
    """
    try:
        vector_db = get_vector_db()
        stats = vector_db.get_collection_stats()
        return CollectionStats(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get collection stats: {str(e)}"
        )


@router.post("/collection/create")
async def create_collection(drop_existing: bool = False):
    """
    Create the vector database collection.

    Args:
        drop_existing: If True, drop existing collection before creating new one.
    """
    try:
        vector_db = get_vector_db()
        vector_db.create_collection(drop_existing=drop_existing)
        return {
            "success": True,
            "message": f"Collection '{vector_db.collection_name}' created successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create collection: {str(e)}")
