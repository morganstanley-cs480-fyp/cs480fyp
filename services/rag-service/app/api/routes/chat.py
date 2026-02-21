"""
Chat completion routes using LLM (Bedrock or Google Gemini).
"""
from fastapi import APIRouter, HTTPException, status

from app.config.settings import settings
from app.services.bedrock_service import BedrockService
from app.services.gemini_service import GeminiService
from app.schemas.chat import (
    Message,
    ChatCompletionRequest,
    ChatCompletionResponse,
)


router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """
    Generate a chat completion using configured LLM provider.
    
    This endpoint:
    1. Takes a list of messages (system, user, assistant)
    2. Routes to appropriate LLM provider (Bedrock or Google Gemini)
    3. Generates a completion
    
    Args:
        request: Chat completion request with messages and parameters
        
    Returns:
        ChatCompletionResponse with generated text
        
    Raises:
        HTTPException: If chat completion generation fails
    """
    try:
        # Convert Pydantic models to dict format
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Route to appropriate LLM provider
        if settings.LLM_PROVIDER == "google":
            # Use Google Gemini
            gemini = GeminiService(
                model_id=settings.GOOGLE_MODEL_ID,
                google_api_key=settings.GOOGLE_API_KEY,
            )
            
            completion = gemini.chat_completion(
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
            
            model_used = settings.GOOGLE_MODEL_ID
            
        elif settings.LLM_PROVIDER == "bedrock":
            # Use AWS Bedrock (legacy/fallback)
            bedrock = BedrockService(
                region_name=settings.AWS_REGION,
                embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
                chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
            
            completion = bedrock.chat_completion(
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )
            
            model_used = settings.BEDROCK_CHAT_MODEL_ID
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unknown LLM provider: {settings.LLM_PROVIDER}"
            )
        
        return ChatCompletionResponse(
            completion=completion,
            model=model_used
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chat completion: {str(e)}"
        )