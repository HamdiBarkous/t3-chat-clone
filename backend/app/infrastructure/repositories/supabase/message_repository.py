from typing import Optional, List, Tuple
from uuid import UUID
import logging

from app.infrastructure.supabase import client, SupabaseError
from app.types import MessageRow, MessageRowCreate, MessageRole, MessageStatus
from app.schemas.message import MessageCreate

logger = logging.getLogger(__name__)


class SupabaseMessageRepository:
    """Supabase implementation of message repository"""
    
    def __init__(self):
        self.client = client
        self.table_name = "messages"

    async def create_message_simple(
        self, 
        conversation_id: UUID,
        user_id: UUID,
        role: MessageRole,
        content: str,
        model_used: Optional[str] = None,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> MessageRow:
        """Create a message with direct parameters - optimized for performance"""
        try:
            create_data = MessageRowCreate(
                conversation_id=conversation_id,
                user_id=user_id,
                role=role,
                content=content,
                model_used=model_used,
                status=status
            )
            
            response = await self.client.table(self.table_name).insert(
                create_data.model_dump()
            ).execute()
            
            if response.data and len(response.data) > 0:
                return MessageRow(**response.data[0])
            else:
                raise SupabaseError("Failed to create message")
                
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            raise SupabaseError(f"Failed to create message: {str(e)}")

    async def create_message_batch(
        self, 
        messages_data: List[tuple[UUID, UUID, MessageRole, str, Optional[str]]]
    ) -> List[MessageRow]:
        """Create multiple messages in single transaction"""
        try:
            # Prepare batch insert data
            insert_data = []
            for conversation_id, user_id, role, content, model_used in messages_data:
                create_data = MessageRowCreate(
                    conversation_id=conversation_id,
                    user_id=user_id,
                    role=role,
                    content=content,
                    model_used=model_used,
                    status=MessageStatus.COMPLETED
                )
                insert_data.append(create_data.model_dump())
            
            response = await self.client.table(self.table_name).insert(insert_data).execute()
            
            if response.data:
                return [MessageRow(**msg) for msg in response.data]
            else:
                raise SupabaseError("Failed to create messages in batch")
                
        except Exception as e:
            logger.error(f"Error creating message batch: {e}")
            raise SupabaseError(f"Failed to create message batch: {str(e)}")

    async def create_message(
        self, 
        message_create: MessageCreate,
        user_id: UUID,
        status: MessageStatus = MessageStatus.COMPLETED
    ) -> MessageRow:
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
    ) -> Optional[MessageRow]:
        """Get message by ID with user ownership check"""
        try:
            response = await self.client.table(self.table_name).select("*").eq(
                "id", str(message_id)
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return MessageRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting message {message_id}: {e}")
            raise SupabaseError(f"Failed to get message: {str(e)}")

    async def update_message_status(
        self, 
        message_id: UUID, 
        status: MessageStatus
    ) -> Optional[MessageRow]:
        """Update message status"""
        try:
            response = await self.client.table(self.table_name).update({
                "status": status.value
            }).eq(
                "id", str(message_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return MessageRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating message status {message_id}: {e}")
            raise SupabaseError(f"Failed to update message status: {str(e)}")

    async def get_conversation_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        limit: int,
        before_timestamp: Optional[str] = None,
        after_timestamp: Optional[str] = None
    ) -> Tuple[List[MessageRow], int, bool]:
        """Get messages for a conversation with pagination"""
        try:
            # Build query for messages with user_id filter
            query = self.client.table(self.table_name).select("*").eq(
                "conversation_id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            )

            # Add timestamp-based pagination
            if before_timestamp:
                query = query.lt("created_at", before_timestamp)
                query = query.order("created_at", desc=True)
            elif after_timestamp:
                query = query.gt("created_at", after_timestamp)
                query = query.order("created_at", desc=False)
            else:
                # Default: get latest messages
                query = query.order("created_at", desc=True)

            # Apply limit + 1 to check if there are more messages
            query = query.limit(limit + 1)
            
            response = await query.execute()
            
            if not response.data:
                return [], 0, False

            messages_data = response.data
            
            # Check if there are more messages
            has_more = len(messages_data) > limit
            if has_more:
                messages_data = messages_data[:limit]

            # Convert to MessageRow objects
            messages = [MessageRow(**msg) for msg in messages_data]

            # If we got messages in descending order, reverse for chronological order
            if before_timestamp is not None or after_timestamp is None:
                messages.reverse()

            # Get total count (approximate)
            total_count = len(messages)

            return messages, total_count, has_more
            
        except Exception as e:
            logger.error(f"Error getting conversation messages: {e}")
            raise SupabaseError(f"Failed to get conversation messages: {str(e)}")

    async def get_conversation_context(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> List[MessageRow]:
        """Get all messages for conversation context (for AI)"""
        try:
            response = await self.client.table(self.table_name).select("*").eq(
                "conversation_id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            ).order(
                "created_at", desc=False
            ).execute()
            
            if not response.data:
                return []
            
            return [MessageRow(**msg) for msg in response.data]
            
        except Exception as e:
            logger.error(f"Error getting conversation context: {e}")
            raise SupabaseError(f"Failed to get conversation context: {str(e)}")

    async def get_first_message_in_conversation(
        self, 
        conversation_id: UUID
    ) -> Optional[MessageRow]:
        """Get the first message in a conversation"""
        try:
            response = await self.client.table(self.table_name).select("*").eq(
                "conversation_id", str(conversation_id)
            ).order(
                "created_at", desc=False
            ).limit(1).execute()
            
            if response.data and len(response.data) > 0:
                return MessageRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting first message: {e}")
            raise SupabaseError(f"Failed to get first message: {str(e)}") 