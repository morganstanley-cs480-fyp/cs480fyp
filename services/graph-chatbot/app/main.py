import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import Settings
from app.services.gemini_service import GeminiService
from app.services.intent_extractor import IntentExtractor
from app.services.generic_query_builder import GenericQueryBuilder
from app.services.response_formatter import ResponseFormatter
from app.services.chatbot_service import AnalyticalChatbot
from app.database.neo4j_client import Neo4jClient
from app.api.routes import chat

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing chatbot services...")
    
    settings = Settings()
    
    # Initialize Neo4j
    neo4j = Neo4jClient(settings.neo4j_uri)
    
    # Initialize services
    gemini = GeminiService(settings.gemini_api_key)
    intent_extractor = IntentExtractor(gemini)
    query_builder = GenericQueryBuilder()
    response_formatter = ResponseFormatter(gemini)
    
    # Initialize chatbot
    chatbot = AnalyticalChatbot(
        intent_extractor,
        query_builder,
        response_formatter,
        neo4j
    )
    
    chat.set_chatbot(chatbot)
    
    logger.info("Chatbot initialized successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await neo4j.close()


app = FastAPI(
    title="Financial Trading Analytical Chatbot",
    description="AI-powered chatbot for analyzing trading exceptions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Routes
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"message": "Financial Trading Analytical Chatbot"}


@app.get("/health")
async def health():
    return {"status": "healthy"}