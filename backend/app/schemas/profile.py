from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class ProfileBase(BaseModel):
    name: Optional[str] = None
    preferred_model: Optional[str] = None
    # Supabase MCP Configuration
    supabase_access_token: Optional[str] = None
    supabase_project_ref: Optional[str] = None
    supabase_read_only: Optional[bool] = True


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