from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID
import enum


class MessageRole(str, enum.Enum):
    """Message role enum matching the database enum"""
    USER = "user"
    ASSISTANT = "assistant"


class MessageStatus(str, enum.Enum):
    """Message status enum matching the database enum"""
    COMPLETED = "completed"
    FAILED = "failed"


class BranchType(str, enum.Enum):
    """Branch type enum for conversation relationships"""
    ORIGINAL = "original"
    BRANCH = "branch"
    EDIT = "edit"
    RETRY = "retry"


class SupabaseModel(BaseModel):
    """Base model with UUID serialization for Supabase"""
    
    def model_dump(self, **kwargs) -> Dict[str, Any]:
        """Override model_dump to convert UUIDs to strings"""
        data = super().model_dump(**kwargs)
        return self._convert_uuids_to_strings(data)
    
    def _convert_uuids_to_strings(self, data: Any) -> Any:
        """Recursively convert UUID objects to strings"""
        if isinstance(data, UUID):
            return str(data)
        elif isinstance(data, dict):
            return {k: self._convert_uuids_to_strings(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._convert_uuids_to_strings(item) for item in data]
        return data

    class Config:
        from_attributes = True


# Base row models for reading from Supabase
class ConversationRow(SupabaseModel):
    """Represents a conversation row from Supabase"""
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    current_model: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    created_at: datetime
    updated_at: datetime
    parent_conversation_id: Optional[UUID] = None
    root_conversation_id: Optional[UUID] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID] = None


class MessageRow(SupabaseModel):
    """Represents a message row from Supabase"""
    id: UUID
    conversation_id: UUID
    user_id: UUID
    role: MessageRole
    content: str
    model_used: Optional[str] = None
    status: MessageStatus = MessageStatus.COMPLETED
    created_at: datetime


class ProfileRow(SupabaseModel):
    """Represents a profile row from Supabase"""
    id: UUID
    email: Optional[str] = None
    display_name: Optional[str] = None
    preferred_model: Optional[str] = None
    # Supabase MCP Configuration
    supabase_access_token: Optional[str] = None
    supabase_project_ref: Optional[str] = None
    supabase_read_only: bool = True
    created_at: datetime
    updated_at: datetime


# Create models for inserting/updating (without auto-generated fields)
class ConversationRowCreate(SupabaseModel):
    """Model for creating new conversations in Supabase"""
    user_id: UUID
    title: Optional[str] = None
    current_model: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    parent_conversation_id: Optional[UUID] = None
    root_conversation_id: Optional[UUID] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID] = None


class ConversationRowUpdate(SupabaseModel):
    """Model for updating conversations in Supabase"""
    title: Optional[str] = None
    current_model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    parent_conversation_id: Optional[UUID] = None
    root_conversation_id: Optional[UUID] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID] = None


class MessageRowCreate(SupabaseModel):
    """Model for creating new messages in Supabase"""
    conversation_id: UUID
    user_id: UUID
    role: MessageRole
    content: str
    model_used: Optional[str] = None
    status: MessageStatus = MessageStatus.COMPLETED


class MessageRowUpdate(SupabaseModel):
    """Model for updating messages in Supabase"""
    content: Optional[str] = None
    status: Optional[MessageStatus] = None
    model_used: Optional[str] = None


class ProfileRowCreate(SupabaseModel):
    """Model for creating new profiles in Supabase"""
    id: Optional[UUID] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    preferred_model: Optional[str] = None
    # Supabase MCP Configuration
    supabase_access_token: Optional[str] = None
    supabase_project_ref: Optional[str] = None
    supabase_read_only: Optional[bool] = True


class ProfileRowUpdate(SupabaseModel):
    """Model for updating profiles in Supabase"""
    display_name: Optional[str] = None
    preferred_model: Optional[str] = None
    # Supabase MCP Configuration
    supabase_access_token: Optional[str] = None
    supabase_project_ref: Optional[str] = None
    supabase_read_only: Optional[bool] = None


# Extended models that include related data for complex queries
class ConversationWithStats(ConversationRow):
    """Conversation with message statistics"""
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    group_order: Optional[int] = None
    branch_order: Optional[int] = None


class MessageWithConversation(MessageRow):
    """Message with conversation details"""
    conversation: Optional[ConversationRow] = None 