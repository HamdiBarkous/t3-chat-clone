from typing import Optional
from uuid import UUID

from app.infrastructure.repositories.profile_repository import ProfileRepository
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse


class ProfileService:
    def __init__(self, profile_repo: ProfileRepository):
        self.profile_repo = profile_repo

    async def get_profile(self, user_id: UUID) -> Optional[ProfileResponse]:
        """Get user profile"""
        profile = await self.profile_repo.get_by_id(user_id)
        if profile:
            return ProfileResponse.model_validate(profile)
        return None

    async def create_profile(self, user_id: UUID, profile_data: ProfileCreate) -> ProfileResponse:
        """Create a new user profile"""
        profile = await self.profile_repo.create(user_id, profile_data)
        return ProfileResponse.model_validate(profile)

    async def create_or_update_profile(self, user_id: UUID, profile_data: ProfileCreate) -> ProfileResponse:
        """Create or update user profile"""
        profile = await self.profile_repo.create_or_update(user_id, profile_data)
        return ProfileResponse.model_validate(profile)

    async def update_profile(self, user_id: UUID, profile_data: ProfileUpdate) -> Optional[ProfileResponse]:
        """Update existing user profile"""
        profile = await self.profile_repo.update(user_id, profile_data)
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