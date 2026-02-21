"""
Document routes for storing and retrieving embeddings.
"""
from typing import List, Dict, Any

from fastapi import APIRouter, Request, HTTPException, status
import httpx
from httpx import HTTPStatusError
import logging

from app.config.settings import settings
from app.services.bedrock_service import BedrockService
from app.services.gemini_service import GeminiService
from app.services.narrative_formatter import NarrativeFormatter
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

logging.basicConfig(level=logging.INFO)
router = APIRouter(prefix="/documents", tags=["documents"])


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


@router.get("/similar-exceptions/{exception_id}", response_model=SimilarExceptionsResponse)
async def find_similar_exceptions(
    request: Request,
    exception_id: str,
    limit: int = 3,
    explain: bool = True
) -> SimilarExceptionsResponse:
    """
    Find similar exceptions using vector similarity search with optional LLM explanations.
    
    This endpoint performs the following:
    1. Retrieves the exception document from Milvus by exception_id
    2. Uses its embedding vector to search for similar exceptions
    3. Optionally generates LLM explanations for why each exception is similar (single batch call)
    4. Returns top N most similar exceptions with similarity scores and explanations
    
    Args:
        exception_id: The exception ID to find similar exceptions for
        limit: Maximum number of similar exceptions to return (default: 3, max: 10)
        explain: Whether to generate LLM explanations (default: True)
        
    Returns:
        SimilarExceptionsResponse with similar exceptions, scores, and explanations
        
    Raises:
        HTTPException 404: If exception_id not found in vector store
        HTTPException 400: If limit is invalid
    """
    # Validate limit
    if limit < 1 or limit > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 10"
        )
    
    try:
        # Step 1: Find similar exceptions using vector store
        similar_docs = request.app.state.vector_store.find_similar_by_exception_id(
            exception_id=exception_id,
            limit=limit,
            exclude_self=True
        )
        
        # Step 2: Get source exception text
        source_doc = request.app.state.vector_store.get_by_exception_id(exception_id)
        source_text = source_doc.get("text", "")
        
        if not similar_docs:
            # No similar exceptions found
            return SimilarExceptionsResponse(
                source_exception_id=exception_id,
                source_text=source_text,
                similar_exceptions=[],
                count=0
            )
        
        # Step 3: Generate explanations in a single batch call (if requested)
        explanations = []
        if explain and settings.LLM_PROVIDER == "google":
            try:
                # Initialize Gemini service
                gemini = GeminiService(
                    model_id=settings.GOOGLE_MODEL_ID,
                    google_api_key=settings.GOOGLE_API_KEY,
                )
                
                # Prepare similar texts for batch processing
                similar_texts = [
                    {
                        "exception_id": doc["exception_id"],
                        "text": doc["text"]
                    }
                    for doc in similar_docs
                ]
                
                # Generate batch explanations
                explanations = gemini.batch_explain_similarities(
                    source_text=source_text,
                    similar_texts=similar_texts,
                    temperature=0.3,  # Lower for factual explanations
                    max_tokens=1500,  # Enough for multiple explanations
                )
                
            except Exception as e:
                logging.error(f"Failed to generate LLM explanations: {str(e)}")
                # Fall back to no explanations on error
                explanations = [None] * len(similar_docs)
        else:
            # Explanations not requested or LLM provider doesn't support batch
            explanations = [None] * len(similar_docs)
        
        # Step 4: Combine similar docs with explanations
        similar_exceptions = []
        for doc, explanation in zip(similar_docs, explanations):
            similar_exceptions.append(
                SimilarException(
                    exception_id=doc["exception_id"],
                    trade_id=doc["trade_id"],
                    similarity_score=doc["similarity_score"],
                    priority=doc["priority"],
                    status=doc["status"],
                    asset_type=doc["asset_type"],
                    clearing_house=doc["clearing_house"],
                    exception_msg=doc["exception_msg"],
                    text=doc["text"],
                    explanation=explanation
                )
            )
        
        return SimilarExceptionsResponse(
            source_exception_id=exception_id,
            source_text=source_text,
            similar_exceptions=similar_exceptions,
            count=len(similar_exceptions)
        )
        
    except ValueError as e:
        # Exception ID not found in vector store
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logging.error(f"Error in find_similar_exceptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding similar exceptions: {str(e)}"
        )


@router.post("/ingest-exception", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_exception(request: Request, payload: IngestException) -> IngestResponse:
    """
    Ingest exception document: fetch exception and trade history, stitch, embed, and store.
    
    Args:
        payload: trade_id and exception_id
        
    Returns:
        IngestResponse
    """
    try:
        # Check if exception already exists in Milvus
        if request.app.state.vector_store.exists_by_exception_id(payload.exception_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Exception {payload.exception_id} already exists in the vector store"
            )
        
        # Fetch exception data
        async with httpx.AsyncClient(base_url=settings.EXCEPTION_SERVICE_URL) as client:
            resp = await client.get(f"/api/exceptions/{payload.exception_id}")
            resp.raise_for_status()
            exception_data = resp.json()

        # Fetch trade details (clearing house, asset type, etc.)
        async with httpx.AsyncClient(base_url=settings.TRADE_FLOW_SERVICE_URL) as client:
            resp = await client.get(f"/trades/{payload.trade_id}")
            resp.raise_for_status()
            trade_data = resp.json()

        # Fetch transaction history
        async with httpx.AsyncClient(base_url=settings.TRADE_FLOW_SERVICE_URL) as client:
            resp = await client.get(f"/trades/{payload.trade_id}/transactions")
            resp.raise_for_status()
            history_data = resp.json()

        # Format as human-readable narrative using the NarrativeFormatter service
        formatter = NarrativeFormatter()
        stitched_text = formatter.format_exception_narrative(
            history_data, 
            exception_data, 
            trade_data,
            payload.trade_id, 
            payload.exception_id
        )

        # Create enriched metadata using the NarrativeFormatter service
        metadata = formatter.create_metadata(
            history_data, 
            exception_data, 
            trade_data,
            payload.trade_id, 
            payload.exception_id
        )

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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during ingestion: {str(e)}"
        )