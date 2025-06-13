from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class ProfileBase(BaseModel):
    name: Optional[str] = None
    preferred_model: Optional[str] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 