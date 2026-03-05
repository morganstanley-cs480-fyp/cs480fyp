from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise import Tortoise
from tortoise.contrib.fastapi import register_tortoise
from aerich import Command
from app.config import settings
from app.views import exception_router, health_router
from aerich_config import TORTOISE_ORM


async def _run_migrations() -> None:
    """Apply any pending aerich migrations on startup.

    Runs before Tortoise's own connection is opened by register_tortoise, so
    the schema is guaranteed to exist when the first request arrives.
    Connections opened by aerich are explicitly closed so register_tortoise
    can create its own pool cleanly.
    """
    command = Command(tortoise_config=TORTOISE_ORM, app="models")
    await command.init()
    await command.upgrade(run_in_transaction=True)
    await Tortoise.close_connections()

# Creates the FastAPI app instance
# redirect_slashes=False prevents FastAPI from issuing 307 redirects from
# /api/exceptions -> /api/exceptions/ which would use http:// when behind an
# HTTP-only ALB origin, causing Mixed Content errors in the browser.
app = FastAPI(title="Exception Service", redirect_slashes=False)

# Run migrations before Tortoise opens its pool (self-healing safety net)
app.add_event_handler("startup", _run_migrations)

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
