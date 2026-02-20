"""
Chat completion routes using AWS Bedrock LLM.
"""
from typing import List, Dict, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config.settings import settings
from app.services.bedrock_service import BedrockService


router = APIRouter(prefix="/chat", tags=["chat"])


class Message(BaseModel):
    """Chat message with role and content."""
    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., min_length=1, description="Message content")


class ChatCompletionRequest(BaseModel):
    """Request for chat completion."""
    messages: List[Message] = Field(..., min_items=1, description="List of messages in the conversation")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Sampling temperature (0.0 to 1.0)")
    max_tokens: int = Field(default=512, gt=0, le=2048, description="Maximum tokens to generate")


class ChatCompletionResponse(BaseModel):
    """Response from chat completion."""
    completion: str = Field(..., description="Generated text completion")
    model: str = Field(..., description="Model used for generation")


@router.post("/completion", response_model=ChatCompletionResponse)
async def chat_completion(request: ChatCompletionRequest) -> ChatCompletionResponse:
    """
    Generate a chat completion using AWS Bedrock Llama 2.
    
    This endpoint:
    1. Takes a list of messages (system, user, assistant)
    2. Formats them for Llama 2 chat model
    3. Generates a completion using Amazon Bedrock
    
    Args:
        request: Chat completion request with messages and parameters
        
    Returns:
        ChatCompletionResponse with generated text
        
    Raises:
        HTTPException: If chat completion generation fails
    """
    try:
        # Initialize Bedrock service with credentials from settings
        bedrock = BedrockService(
            region_name=settings.AWS_REGION,
            embed_model_id=settings.BEDROCK_EMBED_MODEL_ID,
            chat_model_id=settings.BEDROCK_CHAT_MODEL_ID,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        
        # Convert Pydantic models to dict format expected by BedrockService
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Generate chat completion
        completion = bedrock.chat_completion(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        
        return ChatCompletionResponse(
            completion=completion,
            model=settings.BEDROCK_CHAT_MODEL_ID
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
