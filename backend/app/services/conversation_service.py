from typing import Optional, List, Dict, Any, TYPE_CHECKING
from uuid import UUID
import time
import asyncio
from collections import defaultdict

from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationResponse, ConversationListItem

if TYPE_CHECKING:
    from app.services.message_service import MessageService
    from app.services.document_service import DocumentService


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

    async def create_conversation_branch(
        self,
        original_conversation_id: UUID,
        branch_from_message_id: UUID,
        user_id: UUID,
        message_service: "MessageService",
        document_service: "DocumentService"
    ) -> ConversationResponse:
        """Create a new conversation branch from a specific message"""
        # Get the original conversation
        original_conversation = await self.get_conversation(original_conversation_id, user_id)
        if not original_conversation:
            raise ValueError("Original conversation not found")

        # Verify the message exists and belongs to the conversation
        branch_message = await message_service.get_message_by_id(branch_from_message_id, user_id)
        if not branch_message or branch_message.conversation_id != original_conversation_id:
            raise ValueError("Branch message not found or doesn't belong to this conversation")

        # Get all messages up to and including the branch point
        all_messages = await message_service.get_conversation_context(original_conversation_id, user_id)
        
        # Find messages up to the branch point (messages are already in chronological order)
        messages_to_copy = []
        branch_message_found = False
        
        for message in all_messages:
            messages_to_copy.append(message)
            if message.id == branch_from_message_id:
                branch_message_found = True
                break

        if not messages_to_copy:
            raise ValueError("No messages found to copy")
        
        if not branch_message_found:
            raise ValueError("Branch message not found in conversation history")

        # Create new conversation with same settings as original
        new_conversation_data = ConversationCreate(
            title=f"Branch from {original_conversation.title or 'Conversation'}",
            current_model=original_conversation.current_model,
            system_prompt=original_conversation.system_prompt
        )

        new_conversation = await self.create_conversation(user_id, new_conversation_data)

        # Create messages sequentially to guarantee proper order
        message_id_mapping = {}  # Map old message ID to new message ID
        
        for original_message in messages_to_copy:
            # Create each message individually to preserve order
            new_message = await message_service.message_repository.create_message_simple(
                conversation_id=new_conversation.id,
                user_id=user_id,
                role=original_message.role,
                content=original_message.content,
                model_used=original_message.model_used
            )
            
            message_id_mapping[original_message.id] = new_message.id

        # Copy documents for the copied messages
        for original_message in messages_to_copy:
            new_message_id = message_id_mapping[original_message.id]
            
            # Get documents for this specific message
            try:
                docs_result = await document_service.get_message_documents(original_message.id, user_id)
                if docs_result.documents:
                    for document in docs_result.documents:
                        try:
                            await document_service.copy_document_to_message(
                                document.id,
                                new_message_id,
                                user_id
                            )
                        except Exception as e:
                            # Log error but don't fail the branching operation
                            import logging
                            logging.warning(f"Failed to copy document {document.id}: {e}")
            except Exception as e:
                # Log error but continue processing other messages
                import logging
                logging.warning(f"Failed to get documents for message {original_message.id}: {e}")

        return new_conversation 