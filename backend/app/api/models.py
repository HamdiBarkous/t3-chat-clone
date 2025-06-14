from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.message_repository import MessageRepository
from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.services.openrouter_service import OpenRouterService


router = APIRouter()


async def get_message_service(db = Depends(get_db_session)) -> MessageService:
    return MessageService(MessageRepository(db))

async def get_conversation_service(db = Depends(get_db_session)) -> ConversationService:
    return ConversationService(ConversationRepository(db))

async def get_openrouter_service(
    message_service: MessageService = Depends(get_message_service),
    conversation_service: ConversationService = Depends(get_conversation_service)
) -> OpenRouterService:
    return OpenRouterService(message_service, conversation_service)


@router.get("/", response_model=List[Dict[str, Any]])
async def get_available_models(
    current_user: dict = Depends(get_current_user),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service)
):
    """Get list of available AI models from OpenRouter"""
    try:
        models = await openrouter_service.get_available_models()
        return models
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")


@router.get("/health")
async def models_health_check():
    """Health check for models service"""
    return {
        "status": "healthy",
        "service": "models",
        "message": "Models service is operational"
    } 