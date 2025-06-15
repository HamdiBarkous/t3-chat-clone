from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import asyncio
import time
from app.infrastructure.supabase import client

router = APIRouter()

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """
    Basic health check endpoint
    """
    try:
        # Ensure client is initialized
        await client.initialize()
        
        # Simple database connectivity test
        start_time = time.time()
        _ = await client.table("profiles").select("count").limit(1).execute()
        db_response_time = round((time.time() - start_time) * 1000, 2)  # in ms
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "database": {
                "status": "connected",
                "response_time_ms": db_response_time
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service unavailable: {str(e)}"
        )

@router.get("/health/detailed", response_model=Dict[str, Any])
async def detailed_health_check():
    """
    Detailed health check with more comprehensive testing
    """
    health_data = {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Database connectivity test
    try:
        await client.initialize()
        
        start_time = time.time()
        response = await client.table("profiles").select("count").limit(1).execute()
        db_response_time = round((time.time() - start_time) * 1000, 2)
        
        health_data["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": db_response_time,
            "message": "Database connection successful"
        }
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "message": "Database connection failed"
        }
    
    # If any check failed, return 503
    if health_data["status"] == "unhealthy":
        raise HTTPException(
            status_code=503,
            detail=health_data
        )
    
    return health_data 