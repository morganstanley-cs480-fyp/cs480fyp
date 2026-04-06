"""
Chat API route for LLM-led analytics and table retrieval.
"""

from fastapi import APIRouter, HTTPException, status

from app.models.chat import ChatRequest, ChatResponse, ToolsManifestResponse
from app.services.chat_service import chat_service
from app.utils.logger import logger

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(request: ChatRequest) -> ChatResponse:
    """Handle free-form chat query and return table, analysis, or both."""
    logger.info(
        "Received chat request",
        extra={"user_id": request.user_id, "message_preview": request.message[:120]},
    )

    try:
        return await chat_service.execute_chat(request)
    except Exception as exc:
        logger.error(
            "Chat endpoint failed",
            extra={"user_id": request.user_id, "error": str(exc)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "Chat execution failed",
                "message": "Unable to process chat request at this time.",
            },
        ) from exc


@router.get("/chat/tools", response_model=ToolsManifestResponse, status_code=status.HTTP_200_OK)
async def get_chat_tools() -> ToolsManifestResponse:
    """
    Return the manifest of all tools available to the LLM.

    Lists every tool the model can call, its parameters, allowed values,
    data source, and operation type (all are read-only).  Also exposes the
    SQL keyword blocklist so callers understand the safety guardrails.
    """
    return chat_service.build_tools_manifest()
