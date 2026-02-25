"""
Application configuration management using environment variables.
Follows 12-factor app principles for production deployment.
"""

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    For local development, values can be provided via .env file.
    For production (ECS), values are injected via task definition.
    """

    # Service Information
    SERVICE_NAME: str = "search-service"
    VERSION: str = "1.0.0"

    # Database Configuration (PostgreSQL)
    RDS_HOST: str
    RDS_PORT: int = 5432
    RDS_DB: str
    RDS_USER: str
    RDS_PASSWORD: str
    DB_POOL_MIN_SIZE: int = 2
    DB_POOL_MAX_SIZE: int = 10
    DB_COMMAND_TIMEOUT: int = 60

    # Redis Configuration
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_DECODE_RESPONSES: bool = True
    REDIS_SOCKET_TIMEOUT: int = 5
    REDIS_SOCKET_CONNECT_TIMEOUT: int = 5

    # AWS Bedrock Configuration
    BEDROCK_REGION: str = "ap-southeast-2"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-haiku-20240307-v1:0"
    AWS_ACCESS_KEY_ID: Optional[str] = None  # Use IAM role in production
    AWS_SECRET_ACCESS_KEY: Optional[str] = None  # Use IAM role in production
    BEDROCK_MAX_TOKENS: int = 500
    BEDROCK_TEMPERATURE: float = 0.0

    # Google Gemini Configuration (temporary local dev alternative to Bedrock)
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_MODEL_ID: str = "gemini-2.5-flash-lite"

    # Cache TTL (Time To Live) in seconds
    CACHE_TTL_AI_EXTRACTION: int = 3600  # 1 hour
    CACHE_TTL_SEARCH_RESULTS: int = 300  # 5 minutes
    CACHE_TTL_QUERY_HISTORY: int = 900  # 15 minutes

    # Application Settings
    MAX_SEARCH_RESULTS: int = 50
    LOG_LEVEL: str = "INFO"
    ENABLE_CORS: bool = True
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:4173",  # Vite preview server
        "http://localhost:3000",  # Alternative dev port
    ]  # Override in production

    # Retry Configuration
    BEDROCK_RETRY_ATTEMPTS: int = 3
    BEDROCK_RETRY_MIN_WAIT: int = 2
    BEDROCK_RETRY_MAX_WAIT: int = 10

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore"
    )

    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL"""
        return f"postgresql://{self.RDS_USER}:{self.RDS_PASSWORD}@{self.RDS_HOST}:{self.RDS_PORT}/{self.RDS_DB}"

    @property
    def redis_url(self) -> str:
        """Construct Redis connection URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


# Global settings instance
settings = Settings()
