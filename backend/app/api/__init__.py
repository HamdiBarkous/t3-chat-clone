from fastapi import APIRouter
from app.api import user, conversations, health, messages, models, documents

# Create the main API router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(user.router, prefix="/user", tags=["User"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(messages.router, prefix="/conversations", tags=["Messages"])
api_router.include_router(documents.router, prefix="/messages", tags=["Documents"])
api_router.include_router(models.router, prefix="/models", tags=["Models"]) 