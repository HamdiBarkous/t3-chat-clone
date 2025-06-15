from app.infrastructure.repositories.supabase.conversation_repository import SupabaseConversationRepository
from app.infrastructure.repositories.supabase.message_repository import SupabaseMessageRepository
from app.infrastructure.repositories.supabase.profile_repository import SupabaseProfileRepository
from app.infrastructure.repositories.supabase.document_repository import DocumentRepository

# Type aliases for repository interfaces
ConversationRepositoryType = SupabaseConversationRepository
MessageRepositoryType = SupabaseMessageRepository
ProfileRepositoryType = SupabaseProfileRepository
DocumentRepositoryType = DocumentRepository


async def get_conversation_repository() -> ConversationRepositoryType:
    """Get conversation repository"""
    return SupabaseConversationRepository()


async def get_message_repository() -> MessageRepositoryType:
    """Get message repository"""
    return SupabaseMessageRepository()


async def get_profile_repository() -> ProfileRepositoryType:
    """Get profile repository"""
    return SupabaseProfileRepository()


async def get_document_repository() -> DocumentRepositoryType:
    """Get document repository"""
    return DocumentRepository()


# For services that need multiple repositories
class RepositoryFactory:
    """Factory for creating repository instances"""
    
    @staticmethod
    async def get_conversation_repository() -> ConversationRepositoryType:
        return SupabaseConversationRepository()
    
    @staticmethod
    async def get_message_repository() -> MessageRepositoryType:
        return SupabaseMessageRepository()
    
    @staticmethod
    async def get_profile_repository() -> ProfileRepositoryType:
        return SupabaseProfileRepository()
    
    @staticmethod
    async def get_document_repository() -> DocumentRepositoryType:
        return DocumentRepository() 