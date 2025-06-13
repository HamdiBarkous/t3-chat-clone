from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # FastAPI App Settings
    app_name: str = "T3 Chat Backend"
    app_version: str = "0.1.0"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Supabase Configuration
    supabase_url: str = "https://vacjeufoyrwuwzliwple.supabase.co"
    supabase_anon_key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhY2pldWZveXJ3dXd6bGl3cGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDAyNjksImV4cCI6MjA2NTQxNjI2OX0.dJ637xyt9XDVZCIRz3P3r7r9m-6dQm6Ulj9v4v48qW8"
    supabase_service_role_key: Optional[str] = None
    
    # Database
    database_url: Optional[str] = None
    
    # OpenRouter API
    openrouter_api_key: Optional[str] = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
    # Security & JWT
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    # Title Generation
    title_generation_model: str = "gpt-4o-mini"
    
    # CORS Settings
    allowed_origins: list[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Construct database URL if not provided
if not settings.database_url and settings.supabase_url:
    # Extract project ref from Supabase URL
    project_ref = settings.supabase_url.split('//')[1].split('.')[0]
    settings.database_url = f"postgresql://postgres:[YOUR-PASSWORD]@db.{project_ref}.supabase.co:5432/postgres" 