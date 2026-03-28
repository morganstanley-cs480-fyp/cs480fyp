from pydantic import Field

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neo4j
    neo4j_uri: str = Field(
        default="bolt://localhost:7687", # Fallback for local testing if env is missing
        validation_alias="NEPTUNE_ENDPOINT"
    )
    
    # Google Gemini (free)
    gemini_api_key: str = ""
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"