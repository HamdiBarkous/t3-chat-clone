from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime
from app.types.database import BranchType


class ConversationBase(BaseModel):
    title: Optional[str] = None
    current_model: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(default=1.0, ge=0.0, le=2.0, description="Temperature parameter for OpenRouter (0.0-2.0)")
    top_p: Optional[float] = Field(default=1.0, ge=0.1, le=1.0, description="Top-p parameter for OpenRouter (0.1-1.0)")


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    current_model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0, description="Temperature parameter for OpenRouter (0.0-2.0)")
    top_p: Optional[float] = Field(default=None, ge=0.1, le=1.0, description="Top-p parameter for OpenRouter (0.1-1.0)")
    parent_conversation_id: Optional[UUID4] = None
    root_conversation_id: Optional[UUID4] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID4] = None


class ConversationResponse(ConversationBase):
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime
    parent_conversation_id: Optional[UUID4] = None
    root_conversation_id: Optional[UUID4] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID4] = None

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    id: UUID4
    title: Optional[str]
    current_model: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    parent_conversation_id: Optional[UUID4] = None
    root_conversation_id: Optional[UUID4] = None
    branch_type: Optional[BranchType] = None
    branch_point_message_id: Optional[UUID4] = None
    group_order: Optional[int] = None
    branch_order: Optional[int] = None

    class Config:
        from_attributes = True 