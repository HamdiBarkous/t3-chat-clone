from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List
from datetime import datetime
from app.types import MessageRole, MessageStatus


class MessageBase(BaseModel):
    content: str
    role: MessageRole


class MessageCreate(BaseModel):
    conversation_id: UUID
    role: MessageRole
    content: str
    model_used: Optional[str] = None

    class Config:
        from_attributes = True


class MessageUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[MessageStatus] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    role: MessageRole
    content: str
    model_used: Optional[str] = None
    status: MessageStatus
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[str] = None  # timestamp for pagination

    class Config:
        from_attributes = True


class MessageHistoryQuery(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    before_timestamp: Optional[str] = None  # Get messages before this timestamp
    after_timestamp: Optional[str] = None   # Get messages after this timestamp 

    class Config:
        from_attributes = True 