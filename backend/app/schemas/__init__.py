"""
Schemas initialization module
Handles forward reference resolution for Pydantic models
"""

def resolve_forward_references():
    """Resolve forward references between schema models"""
    try:
        # Import the models that need forward reference resolution
        from app.schemas.message import MessageResponse, MessageListResponse
        from app.schemas.document import DocumentResponse
        
        # Rebuild models to resolve forward references
        MessageResponse.model_rebuild()
        MessageListResponse.model_rebuild()
        
        print("✅ Schema forward references resolved successfully")
        
    except ImportError as e:
        print(f"⚠️ Could not resolve schema forward references: {e}")
    except Exception as e:
        print(f"❌ Error resolving schema forward references: {e}")


# Resolve forward references when this module is imported
resolve_forward_references() 