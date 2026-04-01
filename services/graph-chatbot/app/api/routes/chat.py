from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatMessage, ChatResponse
from app.services.chatbot_service import AnalyticalChatbot

router = APIRouter(prefix="/api/chat", tags=["chat"])
chatbot = None


def set_chatbot(bot: AnalyticalChatbot):
    global chatbot
    chatbot = bot


@router.post("/message", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Send a message to the analytical chatbot"""
    
    if not chatbot:
        raise HTTPException(status_code=500, detail="Chatbot not initialized")
    
    return await chatbot.chat(message)