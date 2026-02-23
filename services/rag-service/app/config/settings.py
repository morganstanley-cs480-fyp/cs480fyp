"""
Application configuration loaded from environment variables.
"""

from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings. Override via env vars or .env file."""

    # Service
    SERVICE_NAME: str = "rag-service"
    VERSION: str = "0.1.0"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Logging
    LOG_LEVEL: str = "INFO"

    # CORS
    ENABLE_CORS: bool = True
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
    ]

    # AWS Bedrock
    AWS_REGION: str = "ap-southeast-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    BEDROCK_EMBED_MODEL_ID: str = "amazon.nova-2-embedding-v1"
    BEDROCK_CHAT_MODEL_ID: str = "us.amazon.nova-lite-v1:0"

    # Google AI (for chat/LLM)
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_MODEL_ID: str = "gemini-2.5-flash-lite"
    
    # LLM Provider Selection ("bedrock" or "google")
    LLM_PROVIDER: str = "google"

    # Milvus
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_USER: str = ""  # For production auth
    MILVUS_PASSWORD: str = ""  # For production auth
    MILVUS_COLLECTION: str = "documents"
    MILVUS_SSL: bool = False  # Enable SSL in production
    VECTOR_DIM: int = 1024  # Cohere embedding dimension

    # Service URLs
    EXCEPTION_SERVICE_URL: str = "http://exception-service:8000"
    TRADE_FLOW_SERVICE_URL: str = "http://trade-flow-service:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()