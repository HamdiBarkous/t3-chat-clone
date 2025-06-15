from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import get_profile_repository, ProfileRepositoryType
from app.services.profile_service import ProfileService
from app.schemas.profile import ProfileResponse, ProfileUpdate


router = APIRouter()


async def get_profile_service(
    profile_repo: ProfileRepositoryType = Depends(get_profile_repository)
) -> ProfileService:
    """Dependency to get profile service with repository"""
    return ProfileService(profile_repo)


def enhance_profile_response(profile: ProfileResponse, user_email: str) -> dict:
    """Add email from auth context to profile response"""
    profile_dict = profile.model_dump()
    profile_dict["email"] = user_email
    return profile_dict


@router.get("/profile")
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Get current user's profile"""
    user_id = UUID(current_user["id"])
    user_email = current_user.get("email", "")
    
    profile = await profile_service.get_profile(user_id)
    
    if not profile:
        # Create default profile if doesn't exist
        from app.schemas.profile import ProfileCreate
        default_profile = ProfileCreate(
            name=current_user.get("email", "User"),
            preferred_model="openai/gpt-4o-mini"
        )
        profile = await profile_service.create_profile(user_id, default_profile)
    
    return enhance_profile_response(profile, user_email)


@router.patch("/profile")
async def update_user_profile(
    profile_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Update current user's profile"""
    user_id = UUID(current_user["id"])
    user_email = current_user.get("email", "")
    
    profile = await profile_service.update_profile(user_id, profile_data)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return enhance_profile_response(profile, user_email)


@router.post("/profile", status_code=status.HTTP_201_CREATED)
async def create_user_profile(
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Create a new user profile"""
    user_id = UUID(current_user["id"])
    user_email = current_user.get("email", "")
    
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
        preferred_model="openai/gpt-4o-mini"
    )
    
    profile = await profile_service.create_profile(user_id, default_profile)
    return enhance_profile_response(profile, user_email) 