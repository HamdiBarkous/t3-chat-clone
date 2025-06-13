from typing import Optional, List
from uuid import UUID

from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem
from app.models.conversation import Conversation


class ConversationService:
    def __init__(self, conversation_repo: ConversationRepository):
        self.conversation_repo = conversation_repo

    async def get_conversation(self, conversation_id: UUID, user_id: UUID) -> Optional[ConversationResponse]:
        """Get conversation by ID"""
        conversation = await self.conversation_repo.get_by_id(conversation_id, user_id)
        if conversation:
            return ConversationResponse.model_validate(conversation)
        return None

    async def create_conversation(self, user_id: UUID, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation"""
        conversation = await self.conversation_repo.create(user_id, conversation_data)
        return ConversationResponse.model_validate(conversation)

    async def update_conversation(self, conversation_id: UUID, user_id: UUID, conversation_data: ConversationUpdate) -> Optional[ConversationResponse]:
        """Update existing conversation"""
        conversation = await self.conversation_repo.update(conversation_id, user_id, conversation_data)
        if conversation:
            return ConversationResponse.model_validate(conversation)
        return None

    async def delete_conversation(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Delete conversation"""
        return await self.conversation_repo.delete(conversation_id, user_id)

    async def list_user_conversations(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """List conversations for a user with pagination"""
        return await self.conversation_repo.list_by_user(user_id, limit, offset)

    async def update_conversation_title(self, conversation_id: UUID, user_id: UUID, title: str) -> Optional[ConversationResponse]:
        """Update conversation title (used by auto-title generation)"""
        update_data = ConversationUpdate(title=title)
        return await self.update_conversation(conversation_id, user_id, update_data)

    async def update_conversation_model(self, conversation_id: UUID, user_id: UUID, model: str) -> Optional[ConversationResponse]:
        """Update conversation's current model"""
        update_data = ConversationUpdate(current_model=model)
        return await self.update_conversation(conversation_id, user_id, update_data) 