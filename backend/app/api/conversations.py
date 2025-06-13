from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.services.conversation_service import ConversationService
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem


router = APIRouter()


async def get_conversation_service(db: AsyncSession = Depends(get_db_session)) -> ConversationService:
    """Dependency to get conversation service with repository"""
    conversation_repo = ConversationRepository(db)
    return ConversationService(conversation_repo)


@router.get("/", response_model=List[ConversationListItem])
async def list_conversations(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """List user's conversations with pagination"""
    user_id = UUID(current_user["id"])
    conversations = await conversation_service.list_user_conversations(user_id, limit, offset)
    return conversations


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Create a new conversation"""
    user_id = UUID(current_user["id"])
    conversation = await conversation_service.create_conversation(user_id, conversation_data)
    return conversation


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Get a specific conversation"""
    user_id = UUID(current_user["id"])
    conversation = await conversation_service.get_conversation(conversation_id, user_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    conversation_data: ConversationUpdate,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Update a conversation (system prompt, model, etc.)"""
    user_id = UUID(current_user["id"])
    conversation = await conversation_service.update_conversation(conversation_id, user_id, conversation_data)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Delete a conversation"""
    user_id = UUID(current_user["id"])
    deleted = await conversation_service.delete_conversation(conversation_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        ) 