from fastapi import APIRouter
from app.api import user, conversations, health

# Create the main API router
api_router = APIRouter()

# Include all sub-routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(user.router, prefix="/user", tags=["User"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"]) 