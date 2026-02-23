"""
Chat completion routes using LLM (Bedrock or Google Gemini).
"""
from typing import List, Dict
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


def _inject_plain_text_instruction(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Inject plain text formatting instruction into system message.
    
    Args:
        messages: List of message dictionaries
        
    Returns:
        Modified messages list with formatting instruction
    """
    PLAIN_TEXT_INSTRUCTION = (
        "\n\nIMPORTANT: Respond in plain text without any Markdown formatting. "
        "Do not use **, *, _, #, `, \\n\\n, or any other special formatting characters. "
        "Do not use bullet points (-, *, +) or numbered lists. "
        "Write in clear, simple paragraphs."
    )
    
    # Check if system message exists
    system_msg_index = None
    for i, msg in enumerate(messages):
        if msg["role"] == "system":
            system_msg_index = i
            break
    
    if system_msg_index is not None:
        # Append to existing system message
        messages[system_msg_index]["content"] += PLAIN_TEXT_INSTRUCTION
    else:
        # Create new system message at the beginning
        messages.insert(0, {
            "role": "system",
            "content": f"You are a helpful assistant.{PLAIN_TEXT_INSTRUCTION}"
        })
    
    return messages


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
        
        # Inject plain text instruction for Google Gemini (it uses Markdown by default)
        if settings.LLM_PROVIDER == "google":
            messages = _inject_plain_text_instruction(messages)
        
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