from pydantic_settings import BaseSettings

# Centralised config with Pydantic Settings
# Provides a Singleton Settings instance used throughout the app

class Settings(BaseSettings):
    DATABASE_URL: str = "postgres://user:password@localhost:5432/exception_db"
    
    class Config:
        env_file = ".env"

settings = Settings()
