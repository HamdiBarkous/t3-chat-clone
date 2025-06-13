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
        """Get conversation by ID for a specific user"""
        result = await self.db.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .options(selectinload(Conversation.messages))
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
        """List conversations for a user with pagination and metadata"""
        # Build query with subquery for last message info
        last_message_subquery = (
            select(
                Message.conversation_id,
                func.max(Message.created_at).label("last_message_at"),
                func.count(Message.id).label("message_count")
            )
            .group_by(Message.conversation_id)
            .subquery()
        )

        # Get last message content separately
        last_message_content_subquery = (
            select(
                Message.conversation_id,
                Message.content.label("last_message_preview")
            )
            .distinct(Message.conversation_id)
            .order_by(Message.conversation_id, desc(Message.created_at))
            .subquery()
        )

        result = await self.db.execute(
            select(
                Conversation,
                last_message_subquery.c.message_count,
                last_message_subquery.c.last_message_at,
                last_message_content_subquery.c.last_message_preview
            )
            .outerjoin(last_message_subquery, Conversation.id == last_message_subquery.c.conversation_id)
            .outerjoin(last_message_content_subquery, Conversation.id == last_message_content_subquery.c.conversation_id)
            .where(Conversation.user_id == user_id)
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )

        conversations = []
        for row in result:
            conv, msg_count, last_msg_at, last_msg_preview = row
            conversations.append(ConversationListItem(
                id=conv.id,
                title=conv.title,
                current_model=conv.current_model,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=msg_count or 0,
                last_message_at=last_msg_at,
                last_message_preview=last_msg_preview[:100] + "..." if last_msg_preview and len(last_msg_preview) > 100 else last_msg_preview
            ))

        return conversations 