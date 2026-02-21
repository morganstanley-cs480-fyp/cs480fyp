"""
Chat-related Pydantic schemas for request/response validation.
"""
from typing import List
from pydantic import BaseModel, Field


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
