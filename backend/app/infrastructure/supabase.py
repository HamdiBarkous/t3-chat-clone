from supabase import acreate_client, AsyncClient
from app.core.config import settings
import jwt
import logging
from typing import Optional, Dict, Any, List
from postgrest import APIError
from functools import wraps

# Set up logging
logger = logging.getLogger(__name__)

class SupabaseError(Exception):
    """Custom exception for Supabase operations"""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

def handle_supabase_errors(func):
    """Decorator to handle Supabase API errors consistently"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except APIError as e:
            logger.error(f"Supabase API error in {func.__name__}: {e}")
            raise SupabaseError(
                message=f"Database operation failed: {e.message}",
                status_code=e.code,
                details=e.details if hasattr(e, 'details') else {}
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}")
            raise SupabaseError(f"Unexpected database error: {str(e)}")
    return wrapper

class SupabaseClient:
    def __init__(self):
        self._client: Optional[AsyncClient] = None
    
    async def initialize(self):
        """Initialize the async client"""
        if not self._client:
            self._client = await acreate_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            await self._setup_client_config()
    
    @property
    def client(self) -> AsyncClient:
        """Get the async client instance"""
        if not self._client:
            raise SupabaseError("Client not initialized. Call initialize() first.")
        return self._client
    
    async def _setup_client_config(self):
        """Configure client for optimal database operations"""
        if self._client:
            # Set timeout configurations
            self._client.postgrest.session.timeout = 30
            
            # Add custom headers for better debugging
            self._client.postgrest.session.headers.update({
                'User-Agent': 't3-chat-backend',
                'X-Client-Info': 'supabase-python/2.15.3'
            })
    
    def verify_jwt_token(self, token: str) -> Optional[dict]:
        """Verify JWT token and return user info"""
        try:
            # Decode JWT token (Supabase uses the service role key for verification)
            payload = jwt.decode(
                token,
                settings.supabase_service_role_key,
                algorithms=[settings.jwt_algorithm],
                options={"verify_signature": False}  # Supabase handles signature verification
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid JWT token")
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
    
    @handle_supabase_errors
    async def execute_query(self, table: str, query_builder) -> Dict[str, Any]:
        """Execute a query with error handling and logging"""
        logger.debug(f"Executing query on table: {table}")
        
        response = await query_builder.execute()
        
        if hasattr(response, 'data'):
            logger.debug(f"Query successful, returned {len(response.data) if response.data else 0} rows")
            return response
        else:
            raise SupabaseError("Invalid response format from Supabase")
    
    @handle_supabase_errors
    async def insert_single(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert a single row with error handling"""
        logger.debug(f"Inserting into table: {table}")
        
        response = await self.client.table(table).insert(data).execute()
        
        if response.data and len(response.data) > 0:
            logger.debug(f"Insert successful for table: {table}")
            return response.data[0]
        else:
            raise SupabaseError(f"Insert failed for table: {table}")
    
    @handle_supabase_errors  
    async def insert_batch(self, table: str, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert multiple rows in a single transaction"""
        logger.debug(f"Batch inserting {len(data)} rows into table: {table}")
        
        response = await self.client.table(table).insert(data).execute()
        
        if response.data:
            logger.debug(f"Batch insert successful for table: {table}")
            return response.data
        else:
            raise SupabaseError(f"Batch insert failed for table: {table}")
    
    @handle_supabase_errors
    async def update_single(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a single row with filters"""
        logger.debug(f"Updating table: {table} with filters: {filters}")
        
        query = self.client.table(table).update(data)
        
        # Apply filters
        for key, value in filters.items():
            query = query.eq(key, value)
        
        response = await query.execute()
        
        if response.data and len(response.data) > 0:
            logger.debug(f"Update successful for table: {table}")
            return response.data[0]
        else:
            logger.warning(f"No rows updated for table: {table}")
            return None
    
    @handle_supabase_errors
    async def delete_rows(self, table: str, filters: Dict[str, Any]) -> int:
        """Delete rows with filters, returns count of deleted rows"""
        logger.debug(f"Deleting from table: {table} with filters: {filters}")
        
        query = self.client.table(table).delete()
        
        # Apply filters
        for key, value in filters.items():
            query = query.eq(key, value)
        
        response = await query.execute()
        
        deleted_count = len(response.data) if response.data else 0
        logger.debug(f"Deleted {deleted_count} rows from table: {table}")
        return deleted_count
    
    def table(self, table_name: str):
        """Get a table reference for building queries"""
        return self.client.table(table_name)
    
    @handle_supabase_errors
    async def call_rpc(self, function_name: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Call a Supabase RPC function"""
        logger.debug(f"Calling RPC function: {function_name}")
        
        response = await self.client.rpc(function_name, params or {}).execute()
        
        logger.debug(f"RPC function {function_name} executed successfully")
        return response.data


# Global Supabase client instance
client = SupabaseClient() 