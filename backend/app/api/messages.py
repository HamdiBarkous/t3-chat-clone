from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, Body
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session as get_db
from app.infrastructure.repositories.message_repository import MessageRepository
from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.services.openrouter_service import OpenRouterService
from app.services.streaming_service import StreamingService
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse, MessageHistoryQuery
from app.models.message import MessageRole


# Request models for enhanced endpoints
class StreamChatRequest(BaseModel):
    message_content: str
    model: Optional[str] = None


class EnhancedMessageCreate(BaseModel):
    content: str
    model: Optional[str] = None  # For model switching


router = APIRouter()


def get_message_service(db: AsyncSession = Depends(get_db)) -> MessageService:
    return MessageService(MessageRepository(db))

def get_conversation_service(db: AsyncSession = Depends(get_db)) -> ConversationService:
    return ConversationService(ConversationRepository(db))

def get_openrouter_service(
    message_service: MessageService = Depends(get_message_service),
    conversation_service: ConversationService = Depends(get_conversation_service)
) -> OpenRouterService:
    return OpenRouterService(message_service, conversation_service)

def get_streaming_service(
    message_service: MessageService = Depends(get_message_service),
    openrouter_service: OpenRouterService = Depends(get_openrouter_service)
) -> StreamingService:
    return StreamingService(message_service, openrouter_service)


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def create_message(
    conversation_id: UUID,
    message_data: EnhancedMessageCreate,
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service),
    conversation_service: ConversationService = Depends(get_conversation_service),
    db: AsyncSession = Depends(get_db)
):
    """Create a new message in a conversation with optional model switching"""
    user_id = UUID(current_user["id"])
    
    try:
        # If model is specified, update conversation's current model
        if message_data.model:
            # Verify conversation exists and user has access
            conversation = await conversation_service.get_conversation(conversation_id, user_id, db)
            if not conversation:
                raise ValueError("Conversation not found")
            
            # Update conversation model if different
            if message_data.model != conversation.current_model:
                from app.schemas.conversation import ConversationUpdate
                await conversation_service.update_conversation(
                    conversation_id, 
                    user_id, 
                    ConversationUpdate(current_model=message_data.model)
                )
        
        # Create message
        message_create = MessageCreate(
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=message_data.content,
            model_used=message_data.model
        )
        
        message = await message_service.create_message(
            message_create=message_create,
            user_id=user_id,
            db=db
        )
        return message
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create message")


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    before_sequence: Optional[int] = Query(default=None),
    after_sequence: Optional[int] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a conversation with pagination"""
    query = MessageHistoryQuery(
        limit=limit,
        before_sequence=before_sequence,
        after_sequence=after_sequence
    )
    
    try:
        return await message_service.get_conversation_messages(
            conversation_id=conversation_id,
            user_id=UUID(current_user["id"]),
            db=db,
            query=query
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve messages")


@router.get("/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
async def get_message(
    conversation_id: UUID,
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific message by ID"""
    message = await message_service.get_message_by_id(
        message_id=message_id,
        user_id=UUID(current_user["id"]),
        db=db
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return message


@router.post("/{conversation_id}/messages/stream")
async def stream_chat_response(
    conversation_id: UUID,
    request: StreamChatRequest,
    current_user: dict = Depends(get_current_user),
    streaming_service: StreamingService = Depends(get_streaming_service),
    db: AsyncSession = Depends(get_db)
):
    """Stream a chat response in real-time via Server-Sent Events with optional model switching"""
    try:
        return EventSourceResponse(
            streaming_service.stream_chat_response(
                conversation_id=str(conversation_id),
                user_message=request.message_content,
                user_id=current_user["id"],
                model=request.model,
                db=db
            ),
            media_type="text/event-stream"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to stream chat response")


 