"""
Pydantic schemas for request/response validation.
"""
from app.schemas.document import (
    Document,
    DocumentWithEmbedding,
    SearchQuery,
    IngestDocument,
    IngestResponse,
    SimilarException,
    SimilarExceptionsResponse,
    IngestException,
)
from app.schemas.chat import (
    Message,
    ChatCompletionRequest,
    ChatCompletionResponse,
)

__all__ = [
    # Document schemas
    "Document",
    "DocumentWithEmbedding",
    "SearchQuery",
    "IngestDocument",
    "IngestResponse",
    "SimilarException",
    "SimilarExceptionsResponse",
    "IngestException",
    # Chat schemas
    "Message",
    "ChatCompletionRequest",
    "ChatCompletionResponse",
]
