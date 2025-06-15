from typing import Optional
from uuid import UUID

from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse


class ProfileService:
    def __init__(self, profile_repository):
        self.profile_repository = profile_repository

    async def get_profile(self, user_id: UUID) -> Optional[ProfileResponse]:
        """Get user profile by ID"""
        profile = await self.profile_repository.get_profile(user_id)
        if profile:
            return ProfileResponse.model_validate(profile)
        return None

    async def create_profile(self, user_id: UUID, profile_data: ProfileCreate) -> ProfileResponse:
        """Create a new user profile"""
        profile = await self.profile_repository.create_profile(
            user_id=user_id,
            email=profile_data.email if hasattr(profile_data, 'email') else "",
            display_name=profile_data.name,
            preferred_model=profile_data.preferred_model
        )
        return ProfileResponse.model_validate(profile)

    async def create_or_update_profile(self, user_id: UUID, profile_data: ProfileCreate) -> ProfileResponse:
        """Create or update user profile"""
        profile = await self.profile_repository.create_or_update_profile(user_id, profile_data)
        return ProfileResponse.model_validate(profile)

    async def update_profile(self, user_id: UUID, profile_data: ProfileUpdate) -> Optional[ProfileResponse]:
        """Update existing profile"""
        profile = await self.profile_repository.update_profile(user_id, profile_data)
        if profile:
            return ProfileResponse.model_validate(profile)
        return None

    async def ensure_profile_exists(self, user_id: UUID, name: Optional[str] = None) -> ProfileResponse:
        """Ensure user profile exists, create if not"""
        existing = await self.get_profile(user_id)
        if existing:
            return existing
        
        # Create minimal profile
        profile_data = ProfileCreate(name=name)
        return await self.create_or_update_profile(user_id, profile_data)

    async def delete_profile(self, user_id: UUID) -> bool:
        """Delete user profile"""
        return await self.profile_repository.delete_profile(user_id) 