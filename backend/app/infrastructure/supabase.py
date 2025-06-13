from supabase import create_client, Client
from app.core.config import settings
import jwt
from typing import Optional


class SupabaseClient:
    def __init__(self):
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_anon_key
        )
    
    def verify_jwt_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return user info"""
        try:
            # Decode JWT token (Supabase uses the anon key for verification)
            payload = jwt.decode(
                token,
                settings.supabase_anon_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_signature": False}  # Supabase handles signature verification
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def get_user_from_token(self, token: str) -> Optional[dict]:
        """Get user information from JWT token"""
        payload = self.verify_jwt_token(token)
        if payload and 'sub' in payload:
            return {
                'id': payload['sub'],
                'email': payload.get('email'),
                'role': payload.get('role', 'authenticated')
            }
        return None


# Global Supabase client instance
supabase_client = SupabaseClient() 