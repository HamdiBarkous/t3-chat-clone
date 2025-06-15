from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
from app.types import MessageRole, MessageStatus

if TYPE_CHECKING:
    from app.schemas.document import DocumentResponse


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
    # Optional document metadata (never includes content_text)
    documents: Optional[List["DocumentResponse"]] = None

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