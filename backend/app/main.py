from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router
from app.api import api_router
from app.infrastructure.supabase import client

# Import to resolve schema forward references
import app.schemas


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        description="A chat backend with AI models via OpenRouter",
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Startup event to initialize async client
    @app.on_event("startup")
    async def startup_event():
        """Initialize async client on startup"""
        await client.initialize()
    
    # Include health check router (standalone)
    app.include_router(health_router, tags=["Health"])
    
    # Include main API router
    app.include_router(api_router, prefix="/api/v1")
    
    return app


app = create_app()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.app_name}",
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
        "api": "/api/v1"
    } 