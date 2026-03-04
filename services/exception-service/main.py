from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from app.config import settings
from app.views import exception_router, health_router

# Creates the FastAPI app instance
# redirect_slashes=False prevents FastAPI from issuing 307 redirects from
# /api/exceptions -> /api/exceptions/ which would use http:// when behind an
# HTTP-only ALB origin, causing Mixed Content errors in the browser.
app = FastAPI(title="Exception Service", redirect_slashes=False)

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
