from pydantic import BaseModel, Field, validator
from uuid import UUID
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    filename: str = Field(..., max_length=255, description="Original filename")
    file_type: str = Field(..., max_length=50, description="File extension/type")
    file_size: int = Field(..., gt=0, le=10_485_760, description="File size in bytes (max 10MB)")
    is_image: bool = Field(default=False, description="Whether this is an image file")


class DocumentCreate(DocumentBase):
    message_id: UUID
    content_text: Optional[str] = Field(None, max_length=50_000, description="Extracted text content (not used for images)")
    image_base64: Optional[str] = Field(None, description="Base64 encoded image data for AI processing")

    @validator('file_type')
    def validate_file_type(cls, v):
        """Validate supported file types"""
        allowed_types = {
            # Text files
            'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
            # Code files
            'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h', 'hpp',
            'go', 'rs', 'php', 'rb', 'swift', 'kt', 'scala', 'sh', 'sql',
            # Documents
            'pdf',
            # Images
            'jpg', 'jpeg', 'png', 'gif', 'webp'
        }
        if v.lower() not in allowed_types:
            raise ValueError(f'File type {v} not supported. Supported types: {", ".join(allowed_types)}')
        return v.lower()

    @validator('image_base64', always=True)
    def validate_content_requirements(cls, v, values):
        """Ensure either content_text or image_base64 is provided based on is_image flag"""
        is_image = values.get('is_image', False)
        content_text = values.get('content_text')
        
        if is_image:
            # For images, require image_base64 and forbid content_text
            if not v:
                raise ValueError('image_base64 is required for image files')
            if content_text is not None:
                raise ValueError('content_text should not be provided for image files')
        else:
            # For non-images, require content_text and forbid image_base64
            if not content_text:
                raise ValueError('content_text is required for non-image files')
            if v is not None:
                raise ValueError('image_base64 should not be provided for non-image files')
        
        return v

    @validator('filename')
    def validate_filename(cls, v):
        """Basic filename validation"""
        if not v or v.strip() == '':
            raise ValueError('Filename cannot be empty')
        # Remove any path components for security
        return v.split('/')[-1].split('\\')[-1]

    class Config:
        from_attributes = True


class DocumentUpdate(BaseModel):
    filename: Optional[str] = Field(None, max_length=255)
    
    @validator('filename')
    def validate_filename(cls, v):
        if v is not None:
            if not v or v.strip() == '':
                raise ValueError('Filename cannot be empty')
            return v.split('/')[-1].split('\\')[-1]
        return v

    class Config:
        from_attributes = True


class DocumentResponse(DocumentBase):
    id: UUID
    message_id: UUID
    created_at: datetime
    
    # Note: content_text and image_base64 are intentionally excluded from response
    # They should never be sent to the frontend

    class Config:
        from_attributes = True


class DocumentWithContent(DocumentResponse):
    """Internal use only - includes content for AI processing"""
    content_text: Optional[str] = None
    image_base64: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total_count: int

    class Config:
        from_attributes = True


class DocumentUploadRequest(BaseModel):
    """Request model for document upload"""
    message_id: UUID
    
    class Config:
        from_attributes = True 