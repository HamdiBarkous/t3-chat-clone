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
    supabase_url: str = os.getenv("SUPABASE_URL")   
    supabase_anon_key: str = os.getenv('SUPABASE_ANON_KEY')
    supabase_service_role_key: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # OpenRouter API
    openrouter_api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
    # Security & JWT
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    # Title Generation
    title_generation_model: str = "openai/gpt-4o-mini"
    
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
