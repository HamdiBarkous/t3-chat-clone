from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import (
    get_message_repository, 
    get_conversation_repository,
    get_document_repository,
    MessageRepositoryType,
    ConversationRepositoryType,
    DocumentRepositoryType
)
from app.services.message_service import MessageService
from app.services.conversation_service import ConversationService
from app.services.openrouter_service import OpenRouterService
from app.services.streaming_service import StreamingService
from app.services.document_service import DocumentService
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse, MessageHistoryQuery
from app.types import MessageRole


# Request models for enhanced endpoints
class StreamChatRequest(BaseModel):
    message_content: str
    model: Optional[str] = None
    existing_user_message_id: Optional[str] = None
    use_tools: Optional[bool] = None  # Per-message tool toggle
    enabled_tools: Optional[List[str]] = None  # Override conversation tool settings
    reasoning: Optional[bool] = None  # Enable/disable reasoning


class EnhancedMessageCreate(BaseModel):
    content: str
    model: Optional[str] = None


class MessageEditRequest(BaseModel):
    new_content: str


class MessageRetryRequest(BaseModel):
    model: Optional[str] = None


router = APIRouter()


async def get_document_service(
    document_repo: DocumentRepositoryType = Depends(get_document_repository)
) -> DocumentService:
    return DocumentService(document_repo)

async def get_message_service(
    message_repo: MessageRepositoryType = Depends(get_message_repository),
    document_service: DocumentService = Depends(get_document_service)
) -> MessageService:
    return MessageService(message_repo, document_service)

async def get_conversation_service(
    conversation_repo: ConversationRepositoryType = Depends(get_conversation_repository)
) -> ConversationService:
    return ConversationService(conversation_repo)

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


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def create_message(
    conversation_id: UUID,
    message_data: EnhancedMessageCreate,
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service)
):
    """Ultra-fast message creation - minimal DB operations"""
    user_id = UUID(current_user["id"])
    
    try:
        # Single DB operation - no model switching overhead
        message_create = MessageCreate(
            conversation_id=conversation_id,
            role=MessageRole.USER,
            content=message_data.content,
            model_used=message_data.model
        )
        
        message = await message_service.create_message(
            message_create=message_create,
            user_id=user_id
        )
        
        return message
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create message")


@router.get("/{conversation_id}/messages", response_model=MessageListResponse)
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(default=20, ge=1, le=100),
    before_timestamp: Optional[str] = Query(default=None),
    after_timestamp: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service)
):
    """Get messages with timestamp-based pagination (faster than sequence numbers)"""
    # Create a simplified query - no sequence numbers
    query = MessageHistoryQuery(limit=limit)
    
    try:
        return await message_service.get_conversation_messages(
            conversation_id=conversation_id,
            user_id=UUID(current_user["id"]),
            query=query
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve messages")


@router.get("/{conversation_id}/messages/{message_id}", response_model=MessageResponse)
async def get_message(
    conversation_id: UUID,
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    message_service: MessageService = Depends(get_message_service)
):
    """Get a specific message by ID"""
    message = await message_service.get_message_by_id(
        message_id=message_id,
        user_id=UUID(current_user["id"])
    )
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    return message


@router.post("/{conversation_id}/messages/stream")
async def stream_chat_response(
    conversation_id: UUID,
    request: StreamChatRequest,
    current_user: dict = Depends(get_current_user),
    streaming_service: StreamingService = Depends(get_streaming_service)
):
    """Ultra-fast streaming with minimal DB overhead"""
    try:
        return StreamingResponse(
            streaming_service.stream_chat_response(
                conversation_id=str(conversation_id),
                user_message=request.message_content,
                user_id=current_user["id"],
                model=request.model,
                existing_user_message_id=request.existing_user_message_id,
                use_tools=request.use_tools,
                enabled_tools=request.enabled_tools,
                reasoning=request.reasoning
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
                "Transfer-Encoding": "chunked"  # Ensure chunked encoding
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to stream chat response")


@router.post("/{conversation_id}/messages/{message_id}/edit", response_model=dict)
async def edit_message(
    conversation_id: UUID,
    message_id: UUID,
    request: MessageEditRequest,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
    message_service: MessageService = Depends(get_message_service),
    document_service: DocumentService = Depends(get_document_service)
):
    """Edit a user message by creating a new conversation branch"""
    user_id = UUID(current_user["id"])
    
    try:
        new_conversation = await conversation_service.create_message_edit_branch(
            original_conversation_id=conversation_id,
            edit_message_id=message_id,
            new_content=request.new_content,
            user_id=user_id,
            message_service=message_service,
            document_service=document_service
        )
        
        return {
            "message": "Message edited successfully",
            "new_conversation": new_conversation
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to edit message: {str(e)}")


@router.post("/{conversation_id}/messages/{message_id}/retry", response_model=dict)
async def retry_message(
    conversation_id: UUID,
    message_id: UUID,
    request: MessageRetryRequest,
    current_user: dict = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service),
    message_service: MessageService = Depends(get_message_service),
    document_service: DocumentService = Depends(get_document_service)
):
    """Retry generating an AI response by creating a new conversation branch"""
    user_id = UUID(current_user["id"])
    
    try:
        new_conversation = await conversation_service.create_message_retry_branch(
            original_conversation_id=conversation_id,
            retry_message_id=message_id,
            user_id=user_id,
            new_model=request.model,
            message_service=message_service,
            document_service=document_service
        )
        
        return {
            "message": "Message retry branch created successfully",
            "new_conversation": new_conversation
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry message: {str(e)}")


 