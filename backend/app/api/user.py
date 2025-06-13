from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.profile_repository import ProfileRepository
from app.services.profile_service import ProfileService
from app.schemas.profile import ProfileResponse, ProfileUpdate


router = APIRouter()


async def get_profile_service(db: AsyncSession = Depends(get_db_session)) -> ProfileService:
    """Dependency to get profile service with repository"""
    profile_repo = ProfileRepository(db)
    return ProfileService(profile_repo)


@router.get("/profile", response_model=ProfileResponse)
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Get current user's profile"""
    user_id = UUID(current_user["id"])
    
    # Try to get existing profile
    profile = await profile_service.get_profile(user_id)
    
    if not profile:
        # Create profile if it doesn't exist (from user data)
        profile = await profile_service.ensure_profile_exists(
            user_id, 
            name=current_user.get("email", "").split("@")[0]  # Use email prefix as default name
        )
    
    return profile


@router.patch("/profile", response_model=ProfileResponse)
async def update_user_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Update current user's profile"""
    user_id = UUID(current_user["id"])
    
    # Ensure profile exists first
    await profile_service.ensure_profile_exists(user_id)
    
    # Update profile
    updated_profile = await profile_service.update_profile(user_id, profile_data)
    
    if not updated_profile:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )
    
    return updated_profile 