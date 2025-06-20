from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from pydantic import BaseModel
from typing import Optional

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import get_profile_repository, ProfileRepositoryType
from app.services.profile_service import ProfileService
from app.services.openrouter_service import OpenRouterService
from app.schemas.profile import ProfileResponse, ProfileUpdate


router = APIRouter()


class ApiKeyUpdate(BaseModel):
    api_key: Optional[str] = None


class ApiKeyTest(BaseModel):
    api_key: str


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


@router.put("/api-key")
async def update_api_key(
    api_key_data: ApiKeyUpdate,
    current_user: dict = Depends(get_current_user),
    profile_service: ProfileService = Depends(get_profile_service)
):
    """Update user's OpenRouter API key with validation"""
    user_id = UUID(current_user["id"])
    user_email = current_user.get("email", "")
    
    try:
        # Use the profile service method that handles validation and model access logic
        profile = await profile_service.update_user_api_key(user_id, api_key_data.api_key)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return {
            **enhance_profile_response(profile, user_email),
            "message": "API key updated successfully" if api_key_data.api_key else "API key removed successfully"
        }
        
    except ValueError as e:
        # Handle validation errors with appropriate HTTP status codes
        error_message = str(e).lower()
        
        if "invalid api key" in error_message or "format" in error_message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        elif "insufficient credits" in error_message or "payment" in error_message:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=str(e)
            )
        elif "rate limit" in error_message:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(e)
            )
        else:
            # Generic validation error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        # Handle unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update API key: {str(e)}"
        )


@router.post("/api-key/test")
async def test_api_key(
    api_key_data: ApiKeyTest,
    current_user: dict = Depends(get_current_user)
):
    """Test OpenRouter API key validity without saving it"""
    try:
        # Create OpenRouterService instance for validation
        class DummyService:
            pass
        
        openrouter_service = OpenRouterService(DummyService(), DummyService())
        is_valid, message = await openrouter_service.validate_api_key(api_key_data.api_key)
        
        if is_valid:
            return {
                "valid": True,
                "message": message
            }
        else:
            return {
                "valid": False,
                "message": message
            }
            
    except Exception as e:
        return {
            "valid": False,
            "message": f"Unable to test API key: {str(e)}"
        } 