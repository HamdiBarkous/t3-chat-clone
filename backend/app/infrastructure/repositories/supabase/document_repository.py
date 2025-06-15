from typing import List, Optional
from uuid import UUID
import logging

from app.infrastructure.supabase import client, SupabaseError
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse, DocumentWithContent

logger = logging.getLogger(__name__)


class DocumentRepository:
    """Repository for document attachment operations"""
    
    def __init__(self):
        self.client = client
        self.table_name = "attached_documents"
    
    async def create_document(
        self, 
        document_create: DocumentCreate, 
        user_id: UUID
    ) -> DocumentResponse:
        """Create a new document attachment"""
        try:
            # Verify the message belongs to the user first
            message_check = await self.client.table("messages") \
                .select("id, user_id") \
                .eq("id", str(document_create.message_id)) \
                .eq("user_id", str(user_id)) \
                .execute()
            
            if not message_check.data:
                raise SupabaseError("Message not found or access denied")
            
            # Create the document record
            document_data = {
                "message_id": str(document_create.message_id),
                "filename": document_create.filename,
                "file_type": document_create.file_type,
                "file_size": document_create.file_size,
                "content_text": document_create.content_text
            }
            
            response = await self.client.table(self.table_name) \
                .insert(document_data) \
                .execute()
            
            if not response.data:
                raise SupabaseError("Failed to create document")
            
            document_dict = response.data[0]
            
            # Return response without content_text
            return DocumentResponse(
                id=document_dict["id"],
                message_id=document_dict["message_id"],
                filename=document_dict["filename"],
                file_type=document_dict["file_type"],
                file_size=document_dict["file_size"],
                created_at=document_dict["created_at"]
            )
            
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            raise SupabaseError(f"Failed to create document: {str(e)}")
    
    async def get_document_by_id(
        self, 
        document_id: UUID, 
        user_id: UUID,
        include_content: bool = False
    ) -> Optional[DocumentResponse | DocumentWithContent]:
        """Get a document by ID"""
        try:
            # First verify user access through message ownership
            message_response = await self.client.table("attached_documents") \
                .select("message_id") \
                .eq("id", str(document_id)) \
                .execute()
            
            if not message_response.data:
                return None
            
            message_id = message_response.data[0]["message_id"]
            
            # Verify message ownership
            message_check = await self.client.table("messages") \
                .select("id") \
                .eq("id", message_id) \
                .eq("user_id", str(user_id)) \
                .execute()
            
            if not message_check.data:
                return None
            
            # Get document
            result = await self.client.table(self.table_name) \
                .select("*") \
                .eq("id", str(document_id)) \
                .execute()
            
            if not result.data:
                return None
            
            result = result.data[0]
            
            if not result:
                return None
            
            if include_content:
                return DocumentWithContent(
                    id=result["id"],
                    message_id=result["message_id"],
                    filename=result["filename"],
                    file_type=result["file_type"],
                    file_size=result["file_size"],
                    content_text=result["content_text"],
                    created_at=result["created_at"]
                )
            else:
                return DocumentResponse(
                    id=result["id"],
                    message_id=result["message_id"],
                    filename=result["filename"],
                    file_type=result["file_type"],
                    file_size=result["file_size"],
                    created_at=result["created_at"]
                )
                
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            raise SupabaseError(f"Failed to get document: {str(e)}")
    
    async def get_documents_for_messages_batch(
        self, 
        message_ids: List[UUID], 
        user_id: UUID
    ) -> List[DocumentResponse]:
        """OPTIMIZED: Get documents for multiple messages in single query"""
        try:
            if not message_ids:
                return []
            
            # Convert UUIDs to strings for the query
            message_id_strings = [str(mid) for mid in message_ids]
            
            # Single query to get all documents for all messages
            results = await self.client.table(self.table_name) \
                .select("id, message_id, filename, file_type, file_size, created_at") \
                .in_("message_id", message_id_strings) \
                .order("created_at", desc=False) \
                .execute()
            
            documents = []
            for result in results.data or []:
                documents.append(DocumentResponse(
                    id=result["id"],
                    message_id=result["message_id"],
                    filename=result["filename"],
                    file_type=result["file_type"],
                    file_size=result["file_size"],
                    created_at=result["created_at"]
                ))
            
            return documents
            
        except Exception as e:
            logger.error(f"Error in batch document query: {e}")
            return []
    
    async def get_message_documents(
        self, 
        message_id: UUID, 
        user_id: UUID,
        include_content: bool = False
    ) -> List[DocumentResponse | DocumentWithContent]:
        """Get all documents for a message"""
        try:
            # Verify message ownership first
            message_check = await self.client.table("messages") \
                .select("id") \
                .eq("id", str(message_id)) \
                .eq("user_id", str(user_id)) \
                .execute()
            
            if not message_check.data:
                return []
            
            # Get documents for the message
            results = await self.client.table(self.table_name) \
                .select("*") \
                .eq("message_id", str(message_id)) \
                .order("created_at", desc=False) \
                .execute()
            
            results = results.data
            
            documents = []
            for result in results:
                if include_content:
                    documents.append(DocumentWithContent(
                        id=result["id"],
                        message_id=result["message_id"],
                        filename=result["filename"],
                        file_type=result["file_type"],
                        file_size=result["file_size"],
                        content_text=result["content_text"],
                        created_at=result["created_at"]
                    ))
                else:
                    documents.append(DocumentResponse(
                        id=result["id"],
                        message_id=result["message_id"],
                        filename=result["filename"],
                        file_type=result["file_type"],
                        file_size=result["file_size"],
                        created_at=result["created_at"]
                    ))
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting documents for message {message_id}: {e}")
            raise SupabaseError(f"Failed to get message documents: {str(e)}")
    
    async def get_conversation_documents(
        self, 
        conversation_id: UUID, 
        user_id: UUID,
        include_content: bool = False
    ) -> List[DocumentWithContent]:
        """Get all documents for a conversation (for AI context)"""
        try:
            # First get all messages in the conversation
            messages_response = await self.client.table("messages") \
                .select("id") \
                .eq("conversation_id", str(conversation_id)) \
                .eq("user_id", str(user_id)) \
                .execute()
            
            if not messages_response.data:
                return []
            
            message_ids = [msg["id"] for msg in messages_response.data]
            
            # Get all documents for these messages
            results = await self.client.table(self.table_name) \
                .select("*") \
                .in_("message_id", message_ids) \
                .order("created_at", desc=False) \
                .execute()
            
            results = results.data
            
            documents = []
            for result in results:
                if include_content:
                    documents.append(DocumentWithContent(
                        id=result["id"],
                        message_id=result["message_id"],
                        filename=result["filename"],
                        file_type=result["file_type"],
                        file_size=result["file_size"],
                        content_text=result["content_text"],
                        created_at=result["created_at"]
                    ))
                else:
                    documents.append(DocumentResponse(
                        id=result["id"],
                        message_id=result["message_id"],
                        filename=result["filename"],
                        file_type=result["file_type"],
                        file_size=result["file_size"],
                        created_at=result["created_at"]
                    ))
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting conversation documents {conversation_id}: {e}")
            return []
    

    
    async def update_document(
        self, 
        document_id: UUID, 
        document_update: DocumentUpdate, 
        user_id: UUID
    ) -> Optional[DocumentResponse]:
        """Update a document (currently only filename)"""
        try:
            # Verify ownership through message
            existing = await self.get_document_by_id(document_id, user_id)
            if not existing:
                return None
            
            update_data = {}
            if document_update.filename is not None:
                update_data["filename"] = document_update.filename
            
            if not update_data:
                return existing  # No changes
            
            response = await self.client.table(self.table_name) \
                .update(update_data) \
                .eq("id", str(document_id)) \
                .execute()
            
            if not response.data:
                return None
            
            result = response.data[0]
            return DocumentResponse(
                id=result["id"],
                message_id=result["message_id"],
                filename=result["filename"],
                file_type=result["file_type"],
                file_size=result["file_size"],
                created_at=result["created_at"]
            )
            
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            raise SupabaseError(f"Failed to update document: {str(e)}")
    
    async def delete_document(
        self, 
        document_id: UUID, 
        user_id: UUID
    ) -> bool:
        """Delete a document"""
        try:
            # Verify ownership first
            existing = await self.get_document_by_id(document_id, user_id)
            if not existing:
                return False
            
            response = await self.client.table(self.table_name) \
                .delete() \
                .eq("id", str(document_id)) \
                .execute()
            
            return len(response.data) > 0
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            raise SupabaseError(f"Failed to delete document: {str(e)}")
    
    async def get_document_count_for_message(
        self, 
        message_id: UUID, 
        user_id: UUID
    ) -> int:
        """Get count of documents for a message"""
        try:
            # Verify message ownership first
            message_check = await self.client.table("messages") \
                .select("id") \
                .eq("id", str(message_id)) \
                .eq("user_id", str(user_id)) \
                .execute()
            
            if not message_check.data:
                return 0
            
            # Count documents
            response = await self.client.table(self.table_name) \
                .select("id", count="exact") \
                .eq("message_id", str(message_id)) \
                .execute()
            
            return response.count or 0
            
        except Exception as e:
            logger.error(f"Error counting documents for message {message_id}: {e}")
            return 0 