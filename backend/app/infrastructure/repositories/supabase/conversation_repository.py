from typing import Optional, List
from uuid import UUID
import logging

from app.infrastructure.supabase import supabase_client, SupabaseError
from app.types import (
    ConversationRow, 
    ConversationRowCreate, 
    ConversationRowUpdate,
    ConversationWithStats
)
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationListItem

logger = logging.getLogger(__name__)


class SupabaseConversationRepository:
    """Supabase implementation of conversation repository"""
    
    def __init__(self):
        self.client = supabase_client
        self.table_name = "conversations"

    async def get_by_id(self, conversation_id: UUID, user_id: UUID) -> Optional[ConversationRow]:
        """Get conversation by ID for a specific user"""
        try:
            response = self.client.table(self.table_name).select("*").eq(
                "id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ConversationRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting conversation {conversation_id}: {e}")
            raise SupabaseError(f"Failed to get conversation: {str(e)}")

    async def create(self, user_id: UUID, conversation_data: ConversationCreate) -> ConversationRow:
        """Create a new conversation"""
        try:
            create_data = ConversationRowCreate(
                user_id=user_id,
                title=conversation_data.title,
                current_model=conversation_data.current_model,
                system_prompt=conversation_data.system_prompt
            )
            
            response = self.client.table(self.table_name).insert(
                create_data.model_dump()
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ConversationRow(**response.data[0])
            else:
                raise SupabaseError("Failed to create conversation")
                
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise SupabaseError(f"Failed to create conversation: {str(e)}")

    async def update(self, conversation_id: UUID, user_id: UUID, conversation_data: ConversationUpdate) -> Optional[ConversationRow]:
        """Update an existing conversation"""
        try:
            # Build update data excluding None values
            update_data = {k: v for k, v in conversation_data.model_dump().items() if v is not None}
            
            if not update_data:
                return await self.get_by_id(conversation_id, user_id)

            response = self.client.table(self.table_name).update(update_data).eq(
                "id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ConversationRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating conversation {conversation_id}: {e}")
            raise SupabaseError(f"Failed to update conversation: {str(e)}")

    async def delete(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Delete a conversation"""
        try:
            response = self.client.table(self.table_name).delete().eq(
                "id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            return len(response.data) > 0 if response.data else False
            
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            raise SupabaseError(f"Failed to delete conversation: {str(e)}")

    async def list_by_user(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """List conversations for a user with message statistics"""
        try:
            # Get conversations with pagination
            conversations_response = self.client.table(self.table_name).select("*").eq(
                "user_id", str(user_id)
            ).order(
                "updated_at", desc=True
            ).limit(limit).offset(offset).execute()
            
            if not conversations_response.data:
                return []
            
            conversations = [ConversationRow(**conv) for conv in conversations_response.data]
            conversation_ids = [str(conv.id) for conv in conversations]
            
            # Get message statistics for these conversations
            # Using a more complex query to get stats per conversation
            stats_response = self.client.table("messages").select(
                "conversation_id, content, created_at"
            ).in_(
                "conversation_id", conversation_ids
            ).order("created_at", desc=True).execute()
            
            # Process stats manually since Supabase doesn't support window functions directly
            stats_dict = {}
            for message in stats_response.data or []:
                conv_id = message["conversation_id"]
                if conv_id not in stats_dict:
                    stats_dict[conv_id] = {
                        'message_count': 0,
                        'last_message_at': None,
                        'last_message_preview': None
                    }
                
                stats_dict[conv_id]['message_count'] += 1
                
                # Update latest message info if this is more recent
                if (not stats_dict[conv_id]['last_message_at'] or 
                    message['created_at'] > stats_dict[conv_id]['last_message_at']):
                    stats_dict[conv_id]['last_message_at'] = message['created_at']
                    stats_dict[conv_id]['last_message_preview'] = message['content'][:100] if message['content'] else None

            # Combine results
            result_conversations = []
            for conversation in conversations:
                stats = stats_dict.get(str(conversation.id), {
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
            
        except Exception as e:
            logger.error(f"Error listing conversations for user {user_id}: {e}")
            raise SupabaseError(f"Failed to list conversations: {str(e)}") 