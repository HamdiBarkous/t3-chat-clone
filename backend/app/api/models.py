from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.message_repository import MessageRepository
from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.services.openrouter_service import OpenRouterService


router = APIRouter()


async def get_openrouter_service(db: AsyncSession = Depends(get_db_session)) -> OpenRouterService:
    """Dependency to get OpenRouter service with all dependencies"""
    message_repo = MessageRepository(db)
    conversation_repo = ConversationRepository(db)
    message_service = MessageService(message_repo)
    conversation_service = ConversationService(conversation_repo)
    return OpenRouterService(message_service, conversation_service)


@router.get("/", response_model=List[Dict[str, Any]])
async def get_available_models(
    current_user: dict = Depends(get_current_user),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service)
):
    """Get list of available AI models from OpenRouter"""
    models = await openrouter_service.get_available_models()
    return models 