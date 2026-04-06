"""
Chat request/response models for AI-assisted analytics.
"""

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.models.domain import Trade


class ChatMessage(BaseModel):
    """Conversation message for chat history context."""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Request payload for POST /api/chat."""

    user_id: str = Field(..., min_length=1, description="User ID")
    message: str = Field(..., min_length=3, description="User question")
    conversation: list[ChatMessage] = Field(
        default_factory=list,
        description="Optional conversation history",
    )


class ChatResponse(BaseModel):
    """Response payload for POST /api/chat."""

    mode: Literal["table", "analysis", "both"]
    query_id: int
    total_results: int = 0
    results: Optional[list[Trade]] = None
    ai_answer: Optional[str] = None
    evidence: Optional[dict[str, Any]] = None
    follow_up_prompts: list[str] = Field(default_factory=list)
    execution_time_ms: Optional[float] = None


class ToolParameter(BaseModel):
    """Schema description for a single tool parameter."""

    type: str
    description: str
    allowed_values: Optional[list[str]] = None


class ToolDefinition(BaseModel):
    """Human- and machine-readable description of one LLM tool."""

    name: str
    description: str
    parameters: dict[str, ToolParameter]
    required_parameters: list[str] = Field(default_factory=list)
    operation_type: Literal["read", "write"] = "read"
    data_source: str


class ToolsManifestResponse(BaseModel):
    """Response payload for GET /api/chat/tools."""

    tools: list[ToolDefinition]
    blocked_operations: list[str]
    model: str
    kg_enabled: bool
