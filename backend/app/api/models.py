from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import get_message_repository, get_conversation_repository, MessageRepositoryType, ConversationRepositoryType
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.services.openrouter_service import OpenRouterService


router = APIRouter()


async def get_message_service(
    message_repo: MessageRepositoryType = Depends(get_message_repository)
) -> MessageService:
    return MessageService(message_repo)

async def get_conversation_service(
    conversation_repo: ConversationRepositoryType = Depends(get_conversation_repository)
) -> ConversationService:
    return ConversationService(conversation_repo)

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
    """Get list of available AI models from OpenRouter filtered by user access"""
    try:
        user_id = current_user.get("id")
        models = await openrouter_service.get_available_models(user_id=user_id)
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