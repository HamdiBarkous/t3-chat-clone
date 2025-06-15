from typing import Optional, List, Dict, Any
from uuid import UUID
import time
import asyncio
from collections import defaultdict

from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem


class ConversationService:
    def __init__(self, conversation_repo):
        self.conversation_repo = conversation_repo
        # Enhanced caching with smart invalidation
        self._cache: Dict[str, tuple[Any, float]] = {}
        self._cache_ttl = 300  # 5 minutes
        self._user_locks: Dict[UUID, asyncio.Lock] = defaultdict(asyncio.Lock)

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
        """Get conversation by ID with caching"""
        cache_key = f"conversation:{conversation_id}:{user_id}"
        
        # Check cache first
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if self._is_cache_valid(timestamp):
                return data
        
        # Cache miss - fetch from database
        conversation = await self.conversation_repo.get_by_id(conversation_id, user_id)
        if conversation:
            response = ConversationResponse.model_validate(conversation)
            # Cache the result
            self._cache[cache_key] = (response, time.time())
            return response
        return None

    async def create_conversation(self, user_id: UUID, conversation_data: ConversationCreate) -> ConversationResponse:
        """Create a new conversation with smart cache invalidation"""
        async with self._user_locks[user_id]:  # Prevent race conditions
            conversation = await self.conversation_repo.create(user_id, conversation_data)
            
            # Invalidate cache for this user
            self._invalidate_user_cache(user_id)
            
            response = ConversationResponse.model_validate(conversation)
            
            # Cache the new conversation
            cache_key = f"conversation:{conversation.id}:{user_id}"
            self._cache[cache_key] = (response, time.time())
            
            return response

    async def update_conversation(self, conversation_id: UUID, user_id: UUID, conversation_data: ConversationUpdate) -> Optional[ConversationResponse]:
        """Update existing conversation with cache management"""
        async with self._user_locks[user_id]:  # Prevent race conditions
            conversation = await self.conversation_repo.update(conversation_id, user_id, conversation_data)
            
            # Invalidate specific cache entries
            self._invalidate_conversation_cache(conversation_id, user_id)
            self._invalidate_user_cache(user_id)
            
            if conversation:
                response = ConversationResponse.model_validate(conversation)
                # Update cache
                cache_key = f"conversation:{conversation_id}:{user_id}"
                self._cache[cache_key] = (response, time.time())
                return response
            return None

    async def delete_conversation(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Delete conversation with comprehensive cache cleanup"""
        async with self._user_locks[user_id]:  # Prevent race conditions
            result = await self.conversation_repo.delete(conversation_id, user_id)
            
            if result:
                # Comprehensive cache cleanup
                self._invalidate_conversation_cache(conversation_id, user_id)
                self._invalidate_user_cache(user_id)
            
            return result

    async def list_user_conversations(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """OPTIMIZED: List conversations with enhanced caching and locks"""
        cache_key = self._get_cache_key(user_id, limit, offset)
        
        # Check cache first
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if self._is_cache_valid(timestamp):
                return data
        
        # Use lock to prevent duplicate database calls
        async with self._user_locks[user_id]:
            # Double-check cache after acquiring lock
            if cache_key in self._cache:
                data, timestamp = self._cache[cache_key]
                if self._is_cache_valid(timestamp):
                    return data
            
            # Cache miss - fetch from database using optimized query
            conversations = await self.conversation_repo.list_by_user(user_id, limit, offset)
            
            # Store in cache
            self._cache[cache_key] = (conversations, time.time())
            
            return conversations

    def _invalidate_conversation_cache(self, conversation_id: UUID, user_id: UUID):
        """Invalidate cache for specific conversation"""
        cache_key = f"conversation:{conversation_id}:{user_id}"
        if cache_key in self._cache:
            del self._cache[cache_key]

    def _invalidate_user_cache(self, user_id: UUID):
        """Invalidate all cache entries for a specific user"""
        keys_to_remove = [key for key in self._cache.keys() if f":{user_id}:" in key or key.endswith(f":{user_id}")]
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