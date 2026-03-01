from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from app.config import settings
from app.views import exception_router, health_router

# Creates the FastAPI app instance
app = FastAPI(title="Exception Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(exception_router)

# Register Tortoise ORM to PostgreSQL
register_tortoise(
    app,
    db_url=settings.DATABASE_URL,
    modules={"models": ["app.models"]},
    generate_schemas=False,  # Schema managed by init-scripts
    add_exception_handlers=True,
)
