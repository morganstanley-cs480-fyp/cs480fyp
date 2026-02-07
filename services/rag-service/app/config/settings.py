"""
Application configuration loaded from environment variables.
"""

from typing import List

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

    # Milvus Vector Database
    MILVUS_HOST: str = "localhost"
    MILVUS_PORT: int = 19530
    MILVUS_USER: str = ""
    MILVUS_PASSWORD: str = ""
    MILVUS_COLLECTION_NAME: str = "rag_documents"
    MILVUS_DIMENSION: int = 384  # Default embedding dimension for sentence-transformers

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
