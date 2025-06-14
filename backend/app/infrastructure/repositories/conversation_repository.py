from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, desc, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID

from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationListItem


class ConversationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, conversation_id: UUID, user_id: UUID) -> Optional[Conversation]:
        """Get conversation by ID for a specific user - optimized without loading all messages"""
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            # Removed selectinload(Conversation.messages) - this was loading ALL messages unnecessarily
            # If messages are needed, fetch them separately with pagination
        )
        return result.scalar_one_or_none()



    async def create(self, user_id: UUID, conversation_data: ConversationCreate) -> Conversation:
        """Create a new conversation"""
        conversation = Conversation(
            user_id=user_id,
            title=conversation_data.title,
            current_model=conversation_data.current_model,
            system_prompt=conversation_data.system_prompt
        )
        self.db.add(conversation)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def update(self, conversation_id: UUID, user_id: UUID, conversation_data: ConversationUpdate) -> Optional[Conversation]:
        """Update an existing conversation"""
        # Build update data excluding None values
        update_data = {k: v for k, v in conversation_data.model_dump().items() if v is not None}
        
        if not update_data:
            return await self.get_by_id(conversation_id, user_id)

        await self.db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .values(**update_data)
        )
        await self.db.commit()
        return await self.get_by_id(conversation_id, user_id)

    async def delete(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Delete a conversation"""
        result = await self.db.execute(
            delete(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def list_by_user(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """OPTIMIZED: Simple two-query approach that's fast and reliable"""
        
        # Query 1: Get conversations (very fast)
        conversations_result = await self.db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        conversations = conversations_result.scalars().all()
        
        if not conversations:
            return []
        
        # Query 2: Get message stats in single efficient query
        conversation_ids = [c.id for c in conversations]
        
        # Get stats and latest message content with window function (no GROUP BY issues)
        stats_result = await self.db.execute(
            select(
                Message.conversation_id,
                func.count(Message.id).over(partition_by=Message.conversation_id).label("message_count"),
                func.max(Message.created_at).over(partition_by=Message.conversation_id).label("last_message_at"),
                func.first_value(Message.content).over(
                    partition_by=Message.conversation_id,
                    order_by=desc(Message.created_at),
                    rows=(None, None)
                ).label("last_message_content"),
                func.row_number().over(
                    partition_by=Message.conversation_id,
                    order_by=desc(Message.created_at)
                ).label("rn")
            )
            .where(Message.conversation_id.in_(conversation_ids))
        )
        
        # Process stats (take only first row per conversation)
        stats_dict = {}
        for row in stats_result:
            if row.rn == 1:  # Only take the most recent message per conversation
                preview = row.last_message_content[:100] if row.last_message_content else None
                stats_dict[row.conversation_id] = {
                    'message_count': row.message_count,
                    'last_message_at': row.last_message_at,
                    'last_message_preview': preview
                }
        
        # Combine results
        result_conversations = []
        for conversation in conversations:
            stats = stats_dict.get(conversation.id, {
                'message_count': 0,
                'last_message_at': None,
                'last_message_preview': None
            })
            
            result_conversations.append(ConversationListItem(
                id=conversation.id,
                title=conversation.title,
                current_model=conversation.current_model,
                created_at=conversation.created_at,
                updated_at=conversation.updated_at,
                message_count=stats['message_count'],
                last_message_at=stats['last_message_at'],
                last_message_preview=stats['last_message_preview']
            ))
        
        # Sort by last message activity
        result_conversations.sort(
            key=lambda c: c.last_message_at or c.updated_at,
            reverse=True
        )
        
        return result_conversations 