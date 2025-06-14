from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from app.models.message import MessageRole, MessageStatus


class MessageBase(BaseModel):
    content: str
    role: MessageRole


class MessageCreate(BaseModel):
    content: str
    model: Optional[str] = None  # Optional model override for this message


class MessageResponse(MessageBase):
    id: UUID4
    conversation_id: UUID4
    sequence_number: int
    model_used: Optional[str] = None
    status: MessageStatus
    created_at: datetime

    class Config:
        from_attributes = True


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[int] = None  # sequence_number for pagination


class MessageHistoryQuery(BaseModel):
    limit: int = 20
    before_sequence: Optional[int] = None  # Get messages before this sequence
    after_sequence: Optional[int] = None   # Get messages after this sequence 