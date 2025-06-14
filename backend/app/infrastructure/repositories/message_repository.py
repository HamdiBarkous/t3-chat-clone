from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, asc, desc, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID

from app.models.message import Message, MessageRole, MessageStatus
from app.models.conversation import Conversation
from app.schemas.message import MessageCreate


class MessageRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_message_simple(
        self, 
        conversation_id: UUID,
        user_id: UUID,
        role: MessageRole,
        content: str,
        model_used: Optional[str] = None,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> Message:
        """OPTIMIZED: Simplified message creation with minimal DB operations"""
        # Single query to verify conversation ownership
        conversation_check = await self.db.execute(
            select(Conversation.id).where(
                and_(Conversation.id == conversation_id, Conversation.user_id == user_id)
            )
        )
        if not conversation_check.scalar_one_or_none():
            raise ValueError("Conversation not found or access denied")

        # Create message directly - no sequence numbers, no complex logic
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_used=model_used,
            status=status
        )
        self.db.add(message)
        await self.db.commit()
        
        # OPTIMIZED: Return the message with database-generated values
        # PostgreSQL automatically populates id and created_at after commit
        # No need for expensive refresh() call
        return message

    async def create_message_batch(
        self, 
        messages_data: List[tuple[UUID, UUID, MessageRole, str, Optional[str]]]
    ) -> List[Message]:
        """Create multiple messages in single transaction - optimized for performance"""
        created_messages = []
        
        for conversation_id, user_id, role, content, model_used in messages_data:
            message = Message(
                conversation_id=conversation_id,
                role=role,
                content=content,
                model_used=model_used,
                status=MessageStatus.COMPLETED
            )
            self.db.add(message)
            created_messages.append(message)
        
        await self.db.commit()
        
        # Optimized: Return messages without individual refresh calls
        # The ORM automatically populates IDs and timestamps after commit
        # If you need fresh data, do a single bulk query instead of N refresh calls
        return created_messages

    async def create_message(
        self, 
        message_create: MessageCreate,
        user_id: UUID,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> Message:
        """Legacy interface - delegates to simplified version"""
        return await self.create_message_simple(
            conversation_id=message_create.conversation_id,
            user_id=user_id,
            role=message_create.role,
            content=message_create.content,
            model_used=message_create.model_used,
            status=status
        )

    async def get_message_by_id(
        self, 
        message_id: UUID, 
        user_id: UUID
    ) -> Optional[Message]:
        """Get message by ID with conversation ownership check"""
        result = await self.db.execute(
            select(Message)
            .join(Conversation)
            .where(and_(Message.id == message_id, Conversation.user_id == user_id))
        )
        return result.scalar_one_or_none()

    async def update_message_status(
        self, 
        message_id: UUID, 
        status: MessageStatus
    ) -> Optional[Message]:
        """Update message status"""
        await self.db.execute(
            update(Message)
            .where(Message.id == message_id)
            .values(status=status)
        )
        await self.db.commit()
        
        result = await self.db.execute(select(Message).where(Message.id == message_id))
        return result.scalar_one_or_none()

    async def get_conversation_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        limit: int,
        before_timestamp: Optional[str] = None,
        after_timestamp: Optional[str] = None
    ) -> Tuple[List[Message], int, bool]:
        """OPTIMIZED: Single query for verification + message loading"""
        
        # Single optimized query that verifies ownership AND gets messages
        # This combines the verification and message loading into one database round trip
        base_query = (
            select(
                Message,
                func.count(Message.id).over().label('total_count')
            )
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
        )

        # Add timestamp-based pagination
        if before_timestamp:
            base_query = base_query.where(Message.created_at < before_timestamp)
            base_query = base_query.order_by(desc(Message.created_at))
        elif after_timestamp:
            base_query = base_query.where(Message.created_at > after_timestamp)
            base_query = base_query.order_by(asc(Message.created_at))
        else:
            # Default: get latest messages
            base_query = base_query.order_by(desc(Message.created_at))

        # Apply limit + 1 to check if there are more messages
        base_query = base_query.limit(limit + 1)

        result = await self.db.execute(base_query)
        rows = result.all()
        
        if not rows:
            return [], 0, False
        
        # Extract messages and total count
        messages = [row.Message for row in rows]
        total_count = rows[0].total_count if rows else 0

        # Check if there are more messages
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:limit]

        # If we got messages in descending order, reverse for chronological order
        if before_timestamp is not None or after_timestamp is None:
            messages.reverse()

        return messages, total_count, has_more

    async def get_conversation_context(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> List[Message]:
        """Get conversation context for AI - simplified query"""
        result = await self.db.execute(
            select(Message)
            .join(Conversation)
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.status == MessageStatus.COMPLETED,
                    Conversation.user_id == user_id
                )
            )
            .order_by(asc(Message.created_at))
        )
        return result.scalars().all()

    async def get_first_message_in_conversation(
        self, 
        conversation_id: UUID
    ) -> Optional[Message]:
        """Get first message for title generation"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(asc(Message.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none() 