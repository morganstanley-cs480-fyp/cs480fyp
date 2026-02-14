"""
Document routes for storing and retrieving embeddings.
"""
from typing import List, Dict, Any

from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel, Field

from app.config.settings import settings
from app.services.bedrock_service import BedrockService
import httpx
from httpx import HTTPStatusError
import json
import logging

logging.basicConfig(level=logging.INFO)
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


class IngestDocument(BaseModel):
    """Document to ingest without embedding."""
    text: str = Field(..., min_length=1, description="Document text to embed and store")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Optional metadata for the document")


class IngestResponse(BaseModel):
    """Response after ingesting documents."""
    document_ids: List[int]
    count: int
    message: str


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_documents(request: Request, documents: List[IngestDocument]) -> IngestResponse:
    """
    Ingest documents: generate embeddings using Bedrock and store in Milvus.
    
    This endpoint:
    1. Takes raw text documents
    2. Generates embeddings using Amazon Bedrock (Nova 2)
    3. Stores documents with embeddings in Milvus vector store
    
    Args:
        documents: List of documents with text and optional metadata
        
    Returns:
        IngestResponse with document IDs and status
        
    Raises:
        HTTPException: If embedding generation or storage fails
    """
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents provided for ingestion"
        )
    
    try:
        # Initialize Bedrock service with credentials from settings
        bedrock = BedrockService(
            region_name=settings.AWS_REGION,
            embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
            chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        
        # Generate embeddings for all documents
        texts = [doc.text for doc in documents]
        metadata = [doc.metadata for doc in documents]
        
        embeddings = []
        for text in texts:
            try:
                embedding = bedrock.get_embedding(text)
                embeddings.append(embedding)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to generate embedding: {str(e)}"
                )
        
        # Store in Milvus
        try:
            document_ids = request.app.state.vector_store.add_documents(
                texts=texts,
                embeddings=embeddings,
                metadata=metadata
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to store documents in vector store: {str(e)}"
            )
        
        return IngestResponse(
            document_ids=document_ids,
            count=len(document_ids),
            message=f"Successfully ingested {len(document_ids)} document(s)"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during ingestion: {str(e)}"
        )


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


class IngestException(BaseModel):
    trade_id: str
    exception_id: str


@router.post("/ingest-exception", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_exception(request: Request, payload: IngestException) -> IngestResponse:
    """
    Ingest exception document: fetch exception and trade history, stitch, embed, and store.
    
    Args:
        payload: trade_id and exception_id
        
    Returns:
        IngestResponse
    """
    logging.info("This is an info message")
    try:
        # Fetch exception data
        logging.info("Trying for exception data")
        async with httpx.AsyncClient(base_url=settings.EXCEPTION_SERVICE_URL) as client:
            resp = await client.get(f"/api/exceptions/{payload.exception_id}")
            resp.raise_for_status()
            exception_data = resp.json()

        logging.info(f"Have exception data: {exception_data}")

        # Fetch transaction history
        async with httpx.AsyncClient(base_url=settings.TRADE_FLOW_SERVICE_URL) as client:
            resp = await client.get(f"/trades/{payload.trade_id}/transactions")
            resp.raise_for_status()
            history_data = resp.json()

        logging.info(f"Have transaction history data: {history_data}")

        # Stitch text
        stitched_text = (
            f"Transaction History for Trade ID {payload.trade_id}:\n"
            f"{json.dumps(history_data, indent=2)}\n\n"
            f"Exception Details for Exception ID {payload.exception_id}:\n"
            f"{json.dumps(exception_data, indent=2)}"
        )

        metadata = {
            "trade_id": payload.trade_id,
            "exception_id": payload.exception_id,
            "type": "exception_with_trade_history"
        }

        # Generate embedding
        bedrock = BedrockService(
            region_name=settings.AWS_REGION,
            embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
            chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        embedding = bedrock.get_embedding(stitched_text)

        # Store in Milvus
        document_ids = request.app.state.vector_store.add_documents(
            texts=[stitched_text],
            embeddings=[embedding],
            metadata=[metadata]
        )

        return IngestResponse(
            document_ids=document_ids,
            count=1,
            message=f"Successfully ingested exception document for trade {payload.trade_id} and exception {payload.exception_id}"
        )

    except HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Service error: {e.response.text}")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during ingestion: {str(e)}"
        )