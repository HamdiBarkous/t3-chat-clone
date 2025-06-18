from typing import Optional
from uuid import UUID
import logging

from app.infrastructure.supabase import client, SupabaseError
from app.types import ProfileRow, ProfileRowCreate, ProfileRowUpdate
from app.schemas.profile import ProfileUpdate

logger = logging.getLogger(__name__)


class SupabaseProfileRepository:
    """Supabase implementation of profile repository"""
    
    def __init__(self):
        self.client = client
        self.table_name = "profiles"

    async def get_by_id(self, profile_id: UUID) -> Optional[ProfileRow]:
        """Get profile by ID"""
        try:
            response = await self.client.table(self.table_name).select("*").eq(
                "id", str(profile_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ProfileRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error getting profile {profile_id}: {e}")
            raise SupabaseError(f"Failed to get profile: {str(e)}")

    async def create(self, profile_data: ProfileRowCreate) -> ProfileRow:
        """Create a new profile"""
        try:
            response = await self.client.table(self.table_name).insert(
                profile_data.model_dump()
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ProfileRow(**response.data[0])
            else:
                raise SupabaseError("Failed to create profile")
                
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            raise SupabaseError(f"Failed to create profile: {str(e)}")

    async def update(self, profile_id: UUID, profile_data: ProfileRowUpdate) -> Optional[ProfileRow]:
        """Update an existing profile"""
        try:
            # Build update data excluding None values
            update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
            
            if not update_data:
                return await self.get_by_id(profile_id)

            response = await self.client.table(self.table_name).update(update_data).eq(
                "id", str(profile_id)
            ).execute()
            
            if response.data and len(response.data) > 0:
                return ProfileRow(**response.data[0])
            return None
            
        except Exception as e:
            logger.error(f"Error updating profile {profile_id}: {e}")
            raise SupabaseError(f"Failed to update profile: {str(e)}")

    async def delete(self, profile_id: UUID) -> bool:
        """Delete a profile"""
        try:
            response = await self.client.table(self.table_name).delete().eq(
                "id", str(profile_id)
            ).execute()
            
            return len(response.data) > 0 if response.data else False
            
        except Exception as e:
            logger.error(f"Error deleting profile {profile_id}: {e}")
            raise SupabaseError(f"Failed to delete profile: {str(e)}")

    async def get_by_user_id(self, user_id: UUID) -> Optional[ProfileRow]:
        """Get profile by user ID (assuming profile.id = user.id)"""
        return await self.get_by_id(user_id)

    # Methods expected by the service layer
    async def get_profile(self, user_id: UUID) -> Optional[ProfileRow]:
        """Get profile by user ID"""
        return await self.get_by_user_id(user_id)

    async def create_profile(
        self, 
        user_id: UUID, 
        email: str, 
        display_name: str, 
        preferred_model: str = "openai/gpt-4o-mini",
        supabase_access_token: str = None,
        supabase_project_ref: str = None,
        supabase_read_only: bool = True
    ) -> ProfileRow:
        """Create a new profile with user ID"""
        try:
            create_data = ProfileRowCreate(
                id=user_id,
                email=email,
                display_name=display_name,
                preferred_model=preferred_model,
                supabase_access_token=supabase_access_token,
                supabase_project_ref=supabase_project_ref,
                supabase_read_only=supabase_read_only
            )
            return await self.create(create_data)
        except Exception as e:
            logger.error(f"Error creating profile for user {user_id}: {e}")
            raise SupabaseError(f"Failed to create profile: {str(e)}")

    async def update_profile(self, user_id: UUID, profile_data: ProfileUpdate) -> Optional[ProfileRow]:
        """Update profile using ProfileUpdate schema"""
        try:
            # Map ProfileUpdate to ProfileRowUpdate
            update_data = ProfileRowUpdate(
                display_name=getattr(profile_data, 'name', None),
                preferred_model=getattr(profile_data, 'preferred_model', None),
                supabase_access_token=getattr(profile_data, 'supabase_access_token', None),
                supabase_project_ref=getattr(profile_data, 'supabase_project_ref', None),
                supabase_read_only=getattr(profile_data, 'supabase_read_only', None)
            )
            return await self.update(user_id, update_data)
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}")
            raise SupabaseError(f"Failed to update profile: {str(e)}")

    async def delete_profile(self, user_id: UUID) -> bool:
        """Delete profile by user ID"""
        return await self.delete(user_id) 