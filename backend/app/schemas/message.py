from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from app.models.message import MessageRole, MessageStatus


class MessageBase(BaseModel):
    content: str
    role: MessageRole


class MessageCreate(BaseModel):
    content: str
    conversation_id: Optional[UUID4] = None  # Optional for API, set internally
    role: Optional[MessageRole] = None  # Optional for API, set internally
    model_used: Optional[str] = None  # Optional model override for this message


class MessageResponse(MessageBase):
    id: UUID4
    conversation_id: UUID4
    model_used: Optional[str] = None
    status: MessageStatus
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[str] = None  # timestamp for pagination


class MessageHistoryQuery(BaseModel):
    limit: int = 20
    before_timestamp: Optional[str] = None  # Get messages before this timestamp
    after_timestamp: Optional[str] = None   # Get messages after this timestamp 