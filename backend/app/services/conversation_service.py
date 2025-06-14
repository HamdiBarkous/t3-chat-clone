from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
import time

from app.infrastructure.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem


class ConversationService:
    def __init__(self, conversation_repo: ConversationRepository):
        self.conversation_repo = conversation_repo
        # Simple in-memory cache for conversation lists (5 minute TTL)
        self._cache: Dict[str, tuple[Any, float]] = {}
        self._cache_ttl = 300  # 5 minutes

    def _get_cache_key(self, user_id: UUID, limit: int, offset: int) -> str:
        """Generate cache key for conversation list"""
        return f"conversations:{user_id}:{limit}:{offset}"

    def _is_cache_valid(self, timestamp: float) -> bool:
        """Check if cache entry is still valid"""
        return time.time() - timestamp < self._cache_ttl

    async def get_conversation(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> Optional[ConversationResponse]:
        """Get conversation by ID"""
        conversation = await self.conversation_repo.get_by_id(conversation_id, user_id)
        if conversation:
            return ConversationResponse.model_validate(conversation)
        return None

    async def create_conversation(self, user_id: UUID, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation"""
        conversation = await self.conversation_repo.create(user_id, conversation_data)
        
        # Invalidate cache for this user
        self._invalidate_user_cache(user_id)
        
        return ConversationResponse.model_validate(conversation)

    async def update_conversation(self, conversation_id: UUID, user_id: UUID, conversation_data: ConversationUpdate) -> Optional[ConversationResponse]:
        """Update existing conversation"""
        conversation = await self.conversation_repo.update(conversation_id, user_id, conversation_data)
        
        # Invalidate cache for this user
        self._invalidate_user_cache(user_id)
        
        if conversation:
            return ConversationResponse.model_validate(conversation)
        return None

    async def delete_conversation(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Delete conversation"""
        result = await self.conversation_repo.delete(conversation_id, user_id)
        
        # Invalidate cache for this user
        self._invalidate_user_cache(user_id)
        
        return result

    async def list_user_conversations(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """OPTIMIZED: List conversations with caching"""
        cache_key = self._get_cache_key(user_id, limit, offset)
        
        # Check cache first
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if self._is_cache_valid(timestamp):
                return data
        
        # Cache miss - fetch from database
        conversations = await self.conversation_repo.list_by_user(user_id, limit, offset)
        
        # Store in cache
        self._cache[cache_key] = (conversations, time.time())
        
        return conversations

    def _invalidate_user_cache(self, user_id: UUID):
        """Invalidate all cache entries for a specific user"""
        keys_to_remove = [key for key in self._cache.keys() if f"conversations:{user_id}:" in key]
        for key in keys_to_remove:
            del self._cache[key]

    async def update_conversation_title(
        self, 
        conversation_id: UUID, 
        user_id: UUID, 
        title: str
    ) -> Optional[ConversationResponse]:
        """Update conversation title (used by auto-title generation)"""
        update_data = ConversationUpdate(title=title)
        return await self.update_conversation(conversation_id, user_id, update_data)

    async def update_conversation_model(self, conversation_id: UUID, user_id: UUID, model: str) -> Optional[ConversationResponse]:
        """Update conversation's current model"""
        update_data = ConversationUpdate(current_model=model)
        return await self.update_conversation(conversation_id, user_id, update_data) 