from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_, desc, asc
from typing import Optional, List, Tuple
from uuid import UUID

from app.models.message import Message, MessageRole, MessageStatus
from app.models.conversation import Conversation
from app.schemas.message import MessageCreate


class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_message(
        self, 
        message_create: MessageCreate,
        user_id: UUID,
        status: MessageStatus,
        db: AsyncSession
    ) -> Message:
        """Create a new message with specified status"""
        # Verify user owns the conversation
        conversation_check = await db.execute(
            select(Conversation.id)
            .where(Conversation.id == message_create.conversation_id, Conversation.user_id == user_id)
        )
        if not conversation_check.scalar_one_or_none():
            raise ValueError("Conversation not found or access denied")

        # Get the next sequence number for this conversation
        max_sequence_result = await db.execute(
            select(func.coalesce(func.max(Message.sequence_number), 0))
            .where(Message.conversation_id == message_create.conversation_id)
        )
        next_sequence = max_sequence_result.scalar() + 1

        message = Message(
            conversation_id=message_create.conversation_id,
            sequence_number=next_sequence,
            role=message_create.role,
            content=message_create.content,
            model_used=message_create.model_used,
            status=status
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_message_by_id(
        self, 
        message_id: UUID, 
        user_id: UUID, 
        db: AsyncSession
    ) -> Optional[Message]:
        """Get message by ID, ensuring user owns the conversation"""
        result = await db.execute(
            select(Message)
            .join(Conversation)
            .where(Message.id == message_id, Conversation.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def update_message_status(
        self, 
        message_id: UUID, 
        status: MessageStatus, 
        db: AsyncSession
    ) -> Optional[Message]:
        """Update message status"""
        await db.execute(
            update(Message)
            .where(Message.id == message_id)
            .values(status=status)
        )
        await db.commit()
        
        result = await db.execute(select(Message).where(Message.id == message_id))
        return result.scalar_one_or_none()

    async def update_message_content_and_status(
        self, 
        message_id: UUID, 
        content: str, 
        status: MessageStatus, 
        db: AsyncSession
    ) -> Optional[Message]:
        """Update message content and status"""
        await db.execute(
            update(Message)
            .where(Message.id == message_id)
            .values(content=content, status=status)
        )
        await db.commit()
        
        result = await db.execute(select(Message).where(Message.id == message_id))
        return result.scalar_one_or_none()

    async def get_conversation_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        limit: int,
        before_sequence: Optional[int],
        after_sequence: Optional[int],
        db: AsyncSession
    ) -> Tuple[List[Message], int, bool]:
        """Get paginated messages for a conversation"""
        # Verify user owns the conversation
        conversation_check = await db.execute(
            select(Conversation.id)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        if not conversation_check.scalar_one_or_none():
            return [], 0, False

        # Build base query
        query = select(Message).where(Message.conversation_id == conversation_id)

        # Add pagination filters
        if before_sequence is not None:
            query = query.where(Message.sequence_number < before_sequence)
            query = query.order_by(desc(Message.sequence_number))
        elif after_sequence is not None:
            query = query.where(Message.sequence_number > after_sequence)
            query = query.order_by(asc(Message.sequence_number))
        else:
            # Default: get latest messages
            query = query.order_by(desc(Message.sequence_number))

        # Apply limit + 1 to check if there are more messages
        query = query.limit(limit + 1)

        result = await db.execute(query)
        messages = result.scalars().all()

        # Check if there are more messages
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # If we got messages in descending order (default or before_sequence), reverse them
        if before_sequence is not None or after_sequence is None:
            messages.reverse()

        # Get total count
        count_result = await db.execute(
            select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
        )
        total_count = count_result.scalar()

        return messages, total_count, has_more

    async def get_conversation_context(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        db: AsyncSession
    ) -> List[Message]:
        """Get all completed messages for a conversation (for AI context)"""
        # Verify user owns the conversation
        conversation_check = await db.execute(
            select(Conversation.id)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        if not conversation_check.scalar_one_or_none():
            return []

        result = await db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.status == MessageStatus.COMPLETED  # Only include completed messages
            )
            .order_by(asc(Message.sequence_number))
        )
        return result.scalars().all()

    async def get_first_completed_message_in_conversation(
        self, 
        conversation_id: UUID, 
        db: AsyncSession
    ) -> Optional[Message]:
        """Get the first completed message in conversation (for title generation)"""
        result = await db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.status == MessageStatus.COMPLETED
            )
            .order_by(asc(Message.sequence_number))
            .limit(1)
        )
        return result.scalar_one_or_none()

    # Legacy methods for backward compatibility (to be removed later)
    async def create(self, conversation_id: UUID, user_id: UUID, message_data: MessageCreate, role: MessageRole) -> Message:
        """Legacy create method - use create_message instead"""
        # Create a new MessageCreate with the required fields
        updated_message_data = MessageCreate(
            content=message_data.content,
            conversation_id=conversation_id,
            role=role,
            model_used=message_data.model_used
        )
        return await self.create_message(updated_message_data, user_id, MessageStatus.COMPLETED, self.db)

    async def get_by_id(self, message_id: UUID, user_id: UUID) -> Optional[Message]:
        """Legacy get method - use get_message_by_id instead"""
        return await self.get_message_by_id(message_id, user_id, self.db)

    async def update_status(self, message_id: UUID, status: MessageStatus) -> Optional[Message]:
        """Legacy update method - use update_message_status instead"""
        return await self.update_message_status(message_id, status, self.db)

    async def update_content_and_status(self, message_id: UUID, content: str, status: MessageStatus, model_used: Optional[str] = None) -> Optional[Message]:
        """Legacy update method - use update_message_content_and_status instead"""
        return await self.update_message_content_and_status(message_id, content, status, self.db) 