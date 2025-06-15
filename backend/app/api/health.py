from fastapi import APIRouter, HTTPException
import logging
from datetime import datetime

from app.core.config import settings
from app.infrastructure.supabase import supabase_client

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
async def health_check():
    """Health check endpoint with database connectivity test"""
    try:
        # Test Supabase connectivity
        try:
            # Test a simple query - this will fail if Supabase is not accessible
            _ = supabase_client.client.table("profiles").select("count").limit(1).execute()
            db_status = "healthy"
        except Exception as db_error:
            logger.error(f"Supabase connection failed: {db_error}")
            db_status = "unhealthy"
            
        return {
            "status": "healthy" if db_status == "healthy" else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": settings.app_version,
            "database": db_status,
            "environment": "development" if settings.debug else "production"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with individual service status"""
    
    services = {}
    overall_status = "healthy"
    
    # Test Supabase
    try:
        # Test with a simple query
        response = supabase_client.client.table("profiles").select("count").limit(1).execute()
        services["supabase"] = {"status": "healthy", "response_time_ms": 0}
    except Exception as e:
        logger.error(f"Supabase check failed: {e}")
        services["supabase"] = {"status": "unhealthy", "error": str(e)}
        overall_status = "degraded"
    
    # Test OpenRouter API connectivity (if configured)
    if settings.openrouter_api_key:
        try:
            # Simple connectivity test - don't make actual API call
            services["openrouter"] = {"status": "configured", "base_url": settings.openrouter_base_url}
        except Exception as e:
            services["openrouter"] = {"status": "error", "error": str(e)}
            overall_status = "degraded"
    else:
        services["openrouter"] = {"status": "not_configured"}
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version,
        "services": services,
        "environment": "development" if settings.debug else "production"
    } 