from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from typing import List
from uuid import UUID
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import get_conversation_repository, get_message_repository, ConversationRepositoryType, MessageRepositoryType
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService
from app.services.openrouter_service import OpenRouterService
from app.services.streaming_service import StreamingService
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem


# Request models for dedicated endpoints
class SystemPromptUpdate(BaseModel):
    system_prompt: str


class ModelUpdate(BaseModel):
    model: str


router = APIRouter()


async def get_conversation_service(
    conversation_repo: ConversationRepositoryType = Depends(get_conversation_repository)
) -> ConversationService:
    """Dependency to get conversation service with repository"""
    return ConversationService(conversation_repo)


async def get_message_service(
    message_repo: MessageRepositoryType = Depends(get_message_repository)
) -> MessageService:
    return MessageService(message_repo)


async def get_openrouter_service(
    message_service: MessageService = Depends(get_message_service),
    conversation_service: ConversationService = Depends(get_conversation_service)
) -> OpenRouterService:
    return OpenRouterService(message_service, conversation_service)


async def get_streaming_service(
    message_service: MessageService = Depends(get_message_service),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service),
    conversation_service: ConversationService = Depends(get_conversation_service)
) -> StreamingService:
    return StreamingService(message_service, openrouter_service, conversation_service)


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
    """Update a conversation (system prompt, model, title, etc.)"""
    user_id = UUID(current_user["id"])
    conversation = await conversation_service.update_conversation(conversation_id, user_id, conversation_data)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation


@router.patch("/{conversation_id}/system-prompt", response_model=ConversationResponse)
async def update_system_prompt(
    conversation_id: UUID,
    prompt_data: SystemPromptUpdate,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Update the system prompt for a conversation"""
    user_id = UUID(current_user["id"])
    
    conversation_update = ConversationUpdate(system_prompt=prompt_data.system_prompt)
    conversation = await conversation_service.update_conversation(conversation_id, user_id, conversation_update)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation


@router.patch("/{conversation_id}/model", response_model=ConversationResponse)
async def update_conversation_model(
    conversation_id: UUID,
    model_data: ModelUpdate,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Update the current model for a conversation"""
    user_id = UUID(current_user["id"])
    
    conversation_update = ConversationUpdate(current_model=model_data.model)
    conversation = await conversation_service.update_conversation(conversation_id, user_id, conversation_update)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation


@router.delete("/{conversation_id}/system-prompt")
async def clear_system_prompt(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """Clear the system prompt for a conversation"""
    user_id = UUID(current_user["id"])
    
    conversation_update = ConversationUpdate(system_prompt=None)
    conversation = await conversation_service.update_conversation(conversation_id, user_id, conversation_update)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": "System prompt cleared successfully"}


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


@router.post("/{conversation_id}/generate-title")  
async def generate_conversation_title(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    streaming_service: StreamingService = Depends(get_streaming_service)
):
    """Generate a title for the conversation based on the first exchange"""
    try:
        return StreamingResponse(
            streaming_service.stream_title_generation(
                conversation_id=str(conversation_id),
                user_id=current_user["id"]
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate title: {str(e)}") 