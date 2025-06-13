from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings
from app.infrastructure.database import AsyncSessionLocal
from app.dependencies.auth import get_current_user_optional
from datetime import datetime
from typing import Optional
from sqlalchemy import text

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "version": settings.app_version,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/db")
async def database_health_check():
    """Database connection health check"""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            result.fetchone()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {str(e)}"
        )


@router.get("/health/auth")
async def auth_health_check(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """Authentication health check"""
    return {
        "status": "healthy",
        "authenticated": current_user is not None,
        "user_id": current_user["id"] if current_user else None,
        "timestamp": datetime.utcnow().isoformat(),
    } 