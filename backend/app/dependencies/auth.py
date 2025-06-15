from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.infrastructure.supabase import client
from typing import Optional, Dict

# Security scheme
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, str]:
    """
    Dependency to get current user from JWT token
    """
    try:
        # Ensure client is initialized
        await client.initialize()
        
        # Get user info from token (this is synchronous as it just decodes JWT)
        user = client.get_user_from_token(credentials.credentials)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, str]]:
    """
    Optional dependency to get current user - returns None if no token provided
    """
    if not credentials:
        return None
    
    try:
        # Ensure client is initialized
        await client.initialize()
        
        # Get user info from token (this is synchronous as it just decodes JWT)
        return client.get_user_from_token(credentials.credentials)
    except Exception:
        return None 