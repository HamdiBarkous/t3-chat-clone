from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from uuid import UUID

from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: UUID) -> Optional[Profile]:
        """Get profile by user ID"""
        result = await self.db.execute(
            select(Profile).where(Profile.id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, profile_data: ProfileCreate) -> Profile:
        """Create a new profile"""
        profile = Profile(
            id=user_id,
            name=profile_data.name,
            preferred_model=profile_data.preferred_model
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile

    async def update(self, user_id: UUID, profile_data: ProfileUpdate) -> Optional[Profile]:
        """Update an existing profile"""
        # Build update data excluding None values
        update_data = {k: v for k, v in profile_data.model_dump().items() if v is not None}
        
        if not update_data:
            return await self.get_by_id(user_id)

        await self.db.execute(
            update(Profile)
            .where(Profile.id == user_id)
            .values(**update_data)
        )
        await self.db.commit()
        return await self.get_by_id(user_id)

    async def create_or_update(self, user_id: UUID, profile_data: ProfileCreate) -> Profile:
        """Create profile if it doesn't exist, otherwise update it"""
        existing = await self.get_by_id(user_id)
        if existing:
            return await self.update(user_id, ProfileUpdate(**profile_data.model_dump()))
        else:
            return await self.create(user_id, profile_data) 