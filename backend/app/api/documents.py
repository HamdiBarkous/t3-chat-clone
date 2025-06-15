from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import List
from uuid import UUID

from app.dependencies.auth import get_current_user
from app.dependencies.repositories import get_document_repository, DocumentRepositoryType
from app.services.document_service import DocumentService
from app.schemas.document import DocumentResponse, DocumentListResponse, DocumentUpdate

router = APIRouter()


async def get_document_service(
    document_repo: DocumentRepositoryType = Depends(get_document_repository)
) -> DocumentService:
    return DocumentService(document_repo)


@router.post("/{message_id}/documents", response_model=DocumentResponse)
async def upload_document(
    message_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service)
):
    """Upload a document attachment to a message"""
    user_id = UUID(current_user["id"])
    
    try:
        # Validate file before processing
        validation = await document_service.validate_file_for_upload(file)
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail=validation["error"])
        
        # Upload and process the document
        document = await document_service.upload_document(
            file=file,
            message_id=message_id,
            user_id=user_id
        )
        
        return document
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to upload document")


@router.get("/{message_id}/documents", response_model=DocumentListResponse)
async def get_message_documents(
    message_id: UUID,
    current_user: dict = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service)
):
    """Get all documents attached to a message"""
    user_id = UUID(current_user["id"])
    
    try:
        return await document_service.get_message_documents(message_id, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")


@router.get("/{message_id}/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    message_id: UUID,
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service)
):
    """Get a specific document by ID"""
    user_id = UUID(current_user["id"])
    
    try:
        document = await document_service.get_document(
            document_id=document_id,
            user_id=user_id,
            include_content=False  # Never return content via API
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.put("/{message_id}/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    message_id: UUID,
    document_id: UUID,
    document_update: DocumentUpdate,
    current_user: dict = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service)
):
    """Update a document (currently only filename)"""
    user_id = UUID(current_user["id"])
    
    try:
        document = await document_service.update_document(
            document_id=document_id,
            document_update=document_update,
            user_id=user_id
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return document
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to update document")


@router.delete("/{message_id}/documents/{document_id}")
async def delete_document(
    message_id: UUID,
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    document_service: DocumentService = Depends(get_document_service)
):
    """Delete a document attachment"""
    user_id = UUID(current_user["id"])
    
    try:
        success = await document_service.delete_document(document_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {"message": "Document deleted successfully"}
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/supported-types")
async def get_supported_file_types(
    document_service: DocumentService = Depends(get_document_service)
):
    """Get list of supported file types and upload limits"""
    return await document_service.get_supported_file_types()


@router.post("/validate")
async def validate_file(
    file: UploadFile = File(...),
    document_service: DocumentService = Depends(get_document_service)
):
    """Validate a file before upload without processing it"""
    try:
        validation_result = await document_service.validate_file_for_upload(file)
        return validation_result
    except Exception as e:
        return {"valid": False, "error": f"Validation failed: {str(e)}"}


# Health check endpoint
@router.get("/health")
async def documents_health_check():
    """Health check for documents service"""
    return {
        "status": "healthy",
        "service": "documents",
        "message": "Document service is operational",
        "features": [
            "file_upload",
            "text_extraction", 
            "pdf_support",
            "code_files_support"
        ]
    } 