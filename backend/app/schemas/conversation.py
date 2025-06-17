from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime


class ConversationBase(BaseModel):
    title: Optional[str] = None
    current_model: str
    system_prompt: Optional[str] = None


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    current_model: Optional[str] = None
    system_prompt: Optional[str] = None


class ConversationResponse(ConversationBase):
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime

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

    class Config:
        from_attributes = True 