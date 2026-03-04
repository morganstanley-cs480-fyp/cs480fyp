from app.config import settings

# This is the configuration file specifically for Aerich migration tool
# Defines the Tortoise ORM dictionary tha tells Aerich
# - How to connect to the DB
# - Which models to track for migrations
# - Includes both app models and Aerich;s internal models

# Used when running aerich init, aerich migrate, aerich upgrade commands

TORTOISE_ORM = {
    "connections": {"default": settings.DATABASE_URL},
    "apps": {
        "models": {
            "models": ["app.models", "aerich.models"],
            "default_connection": "default",
        },
    },
}
