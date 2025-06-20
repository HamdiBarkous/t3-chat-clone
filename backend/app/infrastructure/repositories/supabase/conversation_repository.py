from typing import Optional, List
from uuid import UUID
import logging

from app.infrastructure.supabase import client, SupabaseError
from app.types import (
    ConversationRow, 
    ConversationRowCreate, 
)
from app.schemas.conversation import ConversationCreate, ConversationUpdate, ConversationListItem

logger = logging.getLogger(__name__)


class SupabaseConversationRepository:
    """Supabase implementation of conversation repository"""
    
    def __init__(self):
        self.client = client
        self.table_name = "conversations"

    async def get_by_id(self, conversation_id: UUID, user_id: UUID) -> Optional[ConversationRow]:
        """Get conversation by ID for a specific user"""
        try:
            response = await self.client.table(self.table_name).select("*").eq(
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
            
            response = await self.client.table(self.table_name).insert(
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
            # Build update data excluding None values and convert UUIDs to strings
            update_data = {}
            for k, v in conversation_data.model_dump().items():
                if v is not None:
                    # Convert UUID objects to strings for Supabase
                    if isinstance(v, UUID):
                        update_data[k] = str(v)
                    else:
                        update_data[k] = v
            
            if not update_data:
                return await self.get_by_id(conversation_id, user_id)

            response = await self.client.table(self.table_name).update(update_data).eq(
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
            response = await self.client.table(self.table_name).delete().eq(
                "id", str(conversation_id)
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            return len(response.data) > 0 if response.data else False
            
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            raise SupabaseError(f"Failed to delete conversation: {str(e)}")

    async def count_branches_by_type(self, parent_conversation_id: UUID, branch_type: str, user_id: UUID) -> int:
        """Count existing branches of a specific type for a conversation"""
        try:
            response = await self.client.table(self.table_name).select(
                "id", count="exact"
            ).eq(
                "parent_conversation_id", str(parent_conversation_id)
            ).eq(
                "branch_type", branch_type
            ).eq(
                "user_id", str(user_id)
            ).execute()
            
            return response.count or 0
            
        except Exception as e:
            logger.error(f"Error counting branches for conversation {parent_conversation_id}: {e}")
            raise SupabaseError(f"Failed to count branches: {str(e)}")

    async def list_by_user(self, user_id: UUID, limit: int = 20, offset: int = 0) -> List[ConversationListItem]:
        """List conversations with stats using the available function"""
        try:
            # Use the existing RPC function 
            response_data = await self.client.call_rpc('get_conversations_with_stats', {
                'p_user_id': str(user_id),
                'p_limit': limit,
                'p_offset': offset
            })
            
            # Convert results to ConversationListItem objects
            result_conversations = []
            for row in response_data or []:
                result_conversations.append(ConversationListItem(
                    id=UUID(row["id"]),
                    title=row["title"],
                    current_model=row["current_model"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    message_count=row["message_count"] or 0,
                    last_message_at=row["last_message_at"],
                    last_message_preview=row["last_message_preview"],
                    # Now these fields are provided by the updated function
                    parent_conversation_id=UUID(row["parent_conversation_id"]) if row["parent_conversation_id"] else None,
                    root_conversation_id=UUID(row["root_conversation_id"]) if row["root_conversation_id"] else None,
                    branch_type=row["branch_type"],
                    branch_point_message_id=UUID(row["branch_point_message_id"]) if row["branch_point_message_id"] else None,
                    # These are still not implemented yet (for future conversation grouping)
                    group_order=None,
                    branch_order=None
                ))
            
            return result_conversations
            
        except Exception as e:
            logger.error(f"Error in conversation list: {e}")
            raise SupabaseError(f"Failed to list conversations: {str(e)}")
