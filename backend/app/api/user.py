from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from uuid import UUID

from app.dependencies.auth import get_current_user
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.profile_repository import ProfileRepository
from app.services.profile_service import ProfileService
from app.schemas.profile import ProfileResponse, ProfileUpdate


router = APIRouter()


async def get_profile_service(db = Depends(get_db_session)) -> ProfileService:
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
    profile = await profile_service.get_profile(user_id)
    
    if not profile:
        # Create default profile if doesn't exist
        from app.schemas.profile import ProfileCreate
        default_profile = ProfileCreate(
            name=current_user.get("email", "User"),
            preferred_model="gpt-4o-mini"
        )
        profile = await profile_service.create_profile(user_id, default_profile)
    
    return profile


@router.patch("/profile", response_model=ProfileResponse)
async def update_user_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Update current user's profile"""
    user_id = UUID(current_user["id"])
    profile = await profile_service.update_profile(user_id, profile_data)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return profile


@router.post("/profile", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Create a new user profile"""
    user_id = UUID(current_user["id"])
    
    # Check if profile already exists
    existing_profile = await profile_service.get_profile(user_id)
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists"
        )
    
    # Create default profile
    from app.schemas.profile import ProfileCreate
    default_profile = ProfileCreate(
        name=current_user.get("email", "User"),
        preferred_model="gpt-4o-mini"
    )
    
    profile = await profile_service.create_profile(user_id, default_profile)
    return profile 