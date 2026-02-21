"""
Document-related Pydantic schemas for request/response validation.
"""
from typing import List, Dict, Any
from pydantic import BaseModel, Field


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


class IngestDocument(BaseModel):
    """Document to ingest without embedding."""
    text: str = Field(..., min_length=1, description="Document text to embed and store")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional metadata for the document")


class IngestResponse(BaseModel):
    """Response after ingesting documents."""
    document_ids: List[int]
    count: int
    message: str


class SimilarException(BaseModel):
    """Similar exception result with similarity score."""
    exception_id: str
    trade_id: str
    similarity_score: float = Field(..., description="Similarity percentage (0-100)")
    priority: str
    status: str
    asset_type: str
    clearing_house: str
    exception_msg: str


class SimilarExceptionsResponse(BaseModel):
    """Response containing similar exceptions."""
    source_exception_id: str
    similar_exceptions: List[SimilarException]
    count: int


class IngestException(BaseModel):
    """Request to ingest an exception with trade context."""
    trade_id: str
    exception_id: str
