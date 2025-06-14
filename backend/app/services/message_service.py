from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.repositories.message_repository import MessageRepository
from app.schemas.message import MessageCreate, MessageResponse, MessageListResponse, MessageHistoryQuery
from app.models.message import MessageRole, MessageStatus


class MessageService:
    def __init__(self, message_repo: MessageRepository):
        self.message_repo = message_repo

    async def create_message(
        self,
        message_create: MessageCreate,
        user_id: UUID,
        db: AsyncSession,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> MessageResponse:
        """Create a new message with specified status"""
        message = await self.message_repo.create_message(
            message_create=message_create,
            user_id=user_id,
            status=status,
            db=db
        )
        return MessageResponse.model_validate(message)

    async def create_user_message(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        message_data: MessageCreate,
        db: AsyncSession
    ) -> MessageResponse:
        """Create a user message"""
        message = await self.message_repo.create_message(
            message_create=message_data,
            user_id=user_id,
            status=MessageStatus.COMPLETED,
            db=db
        )
        return MessageResponse.model_validate(message)

    async def create_assistant_message(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        content: str, 
        model_used: str,
        db: AsyncSession
    ) -> MessageResponse:
        """Create an assistant message"""
        message_data = MessageCreate(
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=content,
            model_used=model_used
        )
        message = await self.message_repo.create_message(
            message_create=message_data,
            user_id=user_id,
            status=MessageStatus.COMPLETED,
            db=db
        )
        return MessageResponse.model_validate(message)

    async def get_message(self, message_id: UUID, user_id: UUID) -> Optional[MessageResponse]:
        """Get message by ID"""
        message = await self.message_repo.get_by_id(message_id, user_id)
        if message:
            return MessageResponse.model_validate(message)
        return None

    async def update_message_status(self, message_id: UUID, status: MessageStatus) -> Optional[MessageResponse]:
        """Update message status"""
        message = await self.message_repo.update_status(message_id, status)
        if message:
            return MessageResponse.model_validate(message)
        return None

    async def update_message_content(self, message_id: UUID, content: str, status: MessageStatus, model_used: Optional[str] = None) -> Optional[MessageResponse]:
        """Update message content and status (used for AI responses)"""
        message = await self.message_repo.update_content_and_status(message_id, content, status, model_used)
        if message:
            return MessageResponse.model_validate(message)
        return None

    async def get_conversation_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        db: AsyncSession,
        query: Optional[MessageHistoryQuery] = None
    ) -> MessageListResponse:
        """Get messages for a conversation with optional pagination"""
        if query is None:
            query = MessageHistoryQuery(limit=100)
            
        messages, total_count, has_more = await self.message_repo.get_conversation_messages(
            conversation_id=conversation_id,
            user_id=user_id,
            limit=query.limit,
            before_sequence=query.before_sequence,
            after_sequence=query.after_sequence,
            db=db
        )
        
        return MessageListResponse(
            messages=[MessageResponse.model_validate(msg) for msg in messages],
            total_count=total_count,
            has_more=has_more,
            before_sequence=query.before_sequence,
            after_sequence=query.after_sequence
        )

    async def get_message_by_id(
        self,
        message_id: UUID,
        user_id: UUID,
        db: AsyncSession
    ) -> Optional[MessageResponse]:
        """Get a specific message by ID"""
        message = await self.message_repo.get_message_by_id(
            message_id=message_id,
            user_id=user_id,
            db=db
        )
        return MessageResponse.model_validate(message) if message else None

    async def update_message_status(
        self,
        message_id: UUID,
        status: MessageStatus,
        db: AsyncSession
    ) -> Optional[MessageResponse]:
        """Update message status"""
        message = await self.message_repo.update_message_status(
            message_id=message_id,
            status=status,
            db=db
        )
        return MessageResponse.model_validate(message) if message else None

    async def update_message_content_and_status(
        self,
        message_id: UUID,
        content: str,
        status: MessageStatus,
        db: AsyncSession
    ) -> Optional[MessageResponse]:
        """Update message content and status"""
        message = await self.message_repo.update_message_content_and_status(
            message_id=message_id,
            content=content,
            status=status,
            db=db
        )
        return MessageResponse.model_validate(message) if message else None

    async def get_conversation_context_for_ai(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        db: AsyncSession
    ) -> List[MessageResponse]:
        """Get all completed messages for AI context (in chronological order)"""
        messages = await self.message_repo.get_conversation_context(
            conversation_id=conversation_id,
            user_id=user_id,
            db=db
        )
        return [MessageResponse.model_validate(msg) for msg in messages]

    async def get_first_completed_message(
        self, 
        conversation_id: UUID,
        db: AsyncSession
    ) -> Optional[MessageResponse]:
        """Get first completed message (for title generation)"""
        message = await self.message_repo.get_first_completed_message_in_conversation(
            conversation_id=conversation_id,
            db=db
        )
        if message:
            return MessageResponse.model_validate(message)
        return None 