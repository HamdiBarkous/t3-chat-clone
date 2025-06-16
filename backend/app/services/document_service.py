from typing import List, Optional
from uuid import UUID
import logging
import base64
from fastapi import UploadFile

from app.infrastructure.repositories.supabase.document_repository import DocumentRepository
from app.schemas.document import (
    DocumentCreate, DocumentUpdate, DocumentResponse, 
    DocumentWithContent, DocumentListResponse
)
from app.services.text_extraction import TextExtractor, TextExtractionError

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing document attachments"""
    
    def __init__(self, document_repository: DocumentRepository):
        self.document_repository = document_repository
        self.text_extractor = TextExtractor()
    
    async def upload_document(
        self, 
        file: UploadFile, 
        message_id: UUID, 
        user_id: UUID
    ) -> DocumentResponse:
        """Upload and process a document attachment"""
        try:
            # Validate file
            if not file.filename:
                raise ValueError("Filename is required")
            
            # Get file info
            file_content = await file.read()
            file_info = self.text_extractor.get_file_info(file_content, file.filename)
            
            if not file_info['is_supported']:
                raise ValueError(f"File type '{file_info['file_type']}' is not supported")
            
            # Validate file size (10MB limit)
            if file_info['file_size'] > 10_485_760:  # 10MB
                raise ValueError("File size exceeds 10MB limit")
            
            if file_info['file_size'] == 0:
                raise ValueError("File is empty")
            
            # Check if file is an image
            is_image = file_info['file_type'] in {'jpg', 'jpeg', 'png', 'gif', 'webp'}
            
            if is_image:
                # Handle image files
                logger.info(f"Processing image {file.filename} ({file_info['file_type']})")
                
                # Encode image as base64 for AI
                image_base64 = base64.b64encode(file_content).decode('utf-8')
                
                # Create document record for image
                document_create = DocumentCreate(
                    message_id=message_id,
                    filename=file_info['filename'],
                    file_type=file_info['file_type'],
                    file_size=file_info['file_size'],
                    is_image=True,
                    image_base64=image_base64,
                    content_text=None
                )
            else:
                # Handle text/code files (existing logic)
                logger.info(f"Extracting text from {file.filename} ({file_info['file_type']})")
                
                try:
                    extracted_text = self.text_extractor.extract_text(
                        file_content, 
                        file_info['filename'], 
                        file_info['file_type']
                    )
                except TextExtractionError as e:
                    logger.error(f"Text extraction failed for {file.filename}: {e}")
                    raise ValueError(f"Could not extract text from file: {str(e)}")
                
                if not extracted_text.strip():
                    raise ValueError("No text content could be extracted from the file")
                
                # Create document record for text file
                document_create = DocumentCreate(
                    message_id=message_id,
                    filename=file_info['filename'],
                    file_type=file_info['file_type'],
                    file_size=file_info['file_size'],
                    is_image=False,
                    content_text=extracted_text,
                    image_base64=None
                )
            
            document = await self.document_repository.create_document(
                document_create, user_id
            )
            
            logger.info(f"Successfully uploaded {'image' if is_image else 'document'} {document.id} for message {message_id}")
            return document
            
        except ValueError as e:
            logger.warning(f"Document upload validation failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Error uploading document: {e}")
            raise ValueError(f"Failed to upload document: {str(e)}")
    
    async def get_document(
        self, 
        document_id: UUID, 
        user_id: UUID,
        include_content: bool = False
    ) -> Optional[DocumentResponse | DocumentWithContent]:
        """Get a document by ID"""
        try:
            return await self.document_repository.get_document_by_id(
                document_id, user_id, include_content
            )
        except Exception as e:
            logger.error(f"Error getting document {document_id}: {e}")
            raise ValueError(f"Failed to get document: {str(e)}")
    
    async def get_documents_for_messages_batch(
        self, 
        message_ids: List[UUID], 
        user_id: UUID
    ) -> List[DocumentResponse]:
        """OPTIMIZED: Get documents for multiple messages in a single query"""
        try:
            # Create a batch query method in the repository
            return await self.document_repository.get_documents_for_messages_batch(
                message_ids, user_id
            )
        except Exception as e:
            logger.error(f"Error in batch document loading: {e}")
            # Return empty list on error to not break message loading
            return []
    
    async def get_message_documents(
        self, 
        message_id: UUID, 
        user_id: UUID
    ) -> DocumentListResponse:
        """Get all documents for a message"""
        try:
            documents = await self.document_repository.get_message_documents(
                message_id, user_id, include_content=False
            )
            
            return DocumentListResponse(
                documents=documents,
                total_count=len(documents)
            )
            
        except Exception as e:
            logger.error(f"Error getting documents for message {message_id}: {e}")
            raise ValueError(f"Failed to get message documents: {str(e)}")
    
    async def get_conversation_documents_for_ai(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> List[DocumentWithContent]:
        """Get all documents in a conversation with content for AI processing"""
        try:
            return await self.document_repository.get_conversation_documents(
                conversation_id, user_id, include_content=True
            )
        except Exception as e:
            logger.error(f"Error getting conversation documents for AI: {e}")
            # Return empty list on error to not break AI processing
            return []
    
    async def update_document(
        self, 
        document_id: UUID, 
        document_update: DocumentUpdate, 
        user_id: UUID
    ) -> Optional[DocumentResponse]:
        """Update a document (currently only filename)"""
        try:
            return await self.document_repository.update_document(
                document_id, document_update, user_id
            )
        except Exception as e:
            logger.error(f"Error updating document {document_id}: {e}")
            raise ValueError(f"Failed to update document: {str(e)}")
    
    async def delete_document(
        self, 
        document_id: UUID, 
        user_id: UUID
    ) -> bool:
        """Delete a document"""
        try:
            success = await self.document_repository.delete_document(document_id, user_id)
            if success:
                logger.info(f"Successfully deleted document {document_id}")
            return success
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {e}")
            raise ValueError(f"Failed to delete document: {str(e)}")

    async def copy_document_to_message(
        self, 
        source_document_id: UUID, 
        target_message_id: UUID, 
        user_id: UUID
    ) -> DocumentResponse:
        """Copy a document to a new message"""
        try:
            # Get the original document with content
            original_document = await self.document_repository.get_document_by_id(
                source_document_id, user_id, include_content=True
            )
            
            if not original_document:
                raise ValueError("Source document not found")

            # Ensure we have content_text
            if not hasattr(original_document, 'content_text'):
                raise ValueError("Original document does not have content text")

            # Create a new document record with the same content
            document_create = DocumentCreate(
                message_id=target_message_id,
                filename=original_document.filename,
                file_type=original_document.file_type,
                file_size=original_document.file_size,
                content_text=original_document.content_text
            )
            
            new_document = await self.document_repository.create_document(
                document_create, user_id
            )
            
            logger.info(f"Successfully copied document {source_document_id} to message {target_message_id}")
            return new_document
            
        except Exception as e:
            logger.error(f"Error copying document {source_document_id}: {e}")
            raise ValueError(f"Failed to copy document: {str(e)}")
    
    def _get_all_supported_types(self) -> set:
        """Get all supported file extensions"""
        return {
            # Text/Code files
            'pdf', 'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
            'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h', 'hpp',
            'go', 'rs', 'php', 'rb', 'swift', 'kt', 'scala', 'sh', 'sql',
            'css', 'html',
            # Images
            'jpg', 'jpeg', 'png', 'gif', 'webp'
        }
    
    async def get_supported_file_types(self) -> dict:
        """Get list of supported file types with descriptions"""
        return {
            "documents": {
                "pdf": "PDF documents",
            },
            "text_files": {
                "txt": "Plain text files",
                "md": "Markdown files", 
                "csv": "CSV files",
                "json": "JSON files",
                "xml": "XML files",
                "yaml": "YAML files",
                "yml": "YAML files"
            },
            "code_files": {
                "py": "Python files",
                "js": "JavaScript files",
                "ts": "TypeScript files",
                "jsx": "React JSX files",
                "tsx": "React TSX files",
                "java": "Java files",
                "cpp": "C++ files",
                "c": "C files",
                "h": "C/C++ header files",
                "hpp": "C++ header files",
                "go": "Go files",
                "rs": "Rust files",
                "php": "PHP files",
                "rb": "Ruby files",
                "swift": "Swift files",
                "kt": "Kotlin files",
                "scala": "Scala files",
                "sh": "Shell scripts",
                "sql": "SQL files",
                "css": "CSS files",
                "html": "HTML files"
            },
            "images": {
                "jpg": "JPEG images",
                "jpeg": "JPEG images",
                "png": "PNG images",
                "gif": "GIF images",
                "webp": "WebP images"
            },
            "limits": {
                "max_file_size": "10MB",
                "max_content_length": "50,000 characters",
                "supported_count": len(self._get_all_supported_types())
            }
        }
    
    async def validate_file_for_upload(self, file: UploadFile) -> dict:
        """Validate a file before upload and return validation info"""
        try:
            if not file.filename:
                return {"valid": False, "error": "Filename is required"}
            
            # Check file size without reading full content first
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > 10_485_760:  # 10MB
                return {"valid": False, "error": "File size exceeds 10MB limit"}
            
            if file_size == 0:
                return {"valid": False, "error": "File is empty"}
            
            # Get file type
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
            
            if not self.text_extractor.is_supported_file_type(file_extension):
                return {
                    "valid": False, 
                    "error": f"File type '{file_extension}' is not supported"
                }
            
            estimated_time = self.text_extractor.estimate_extraction_time(file_size, file_extension)
            
            return {
                "valid": True,
                "filename": file.filename,
                "file_type": file_extension,
                "file_size": file_size,
                "estimated_processing_time": estimated_time
            }
            
        except Exception as e:
            logger.error(f"Error validating file: {e}")
            return {"valid": False, "error": f"File validation failed: {str(e)}"} 