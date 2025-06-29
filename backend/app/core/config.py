from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # FastAPI App Settings
    app_name: str = "T3 Chat Backend"
    app_version: str = "0.1.0"
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Supabase Configuration
    supabase_url: str = os.getenv("SUPABASE_URL")   
    supabase_anon_key: str = os.getenv('SUPABASE_ANON_KEY')
    supabase_service_role_key: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # OpenRouter API
    openrouter_api_key: Optional[str] = os.getenv("OPENROUTER_API_KEY")
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    
    # Firecrawl API
    firecrawl_api_key: Optional[str] = os.getenv("FIRECRAWL_API_KEY")
    
    # Tavily API
    tavily_api_key: Optional[str] = os.getenv("TAVILY_API_KEY")
    
    # Security & JWT
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    
    # Title Generation
    title_generation_model: str = "openai/gpt-4o-mini"
    
    # OpenRouter Transforms (Context Management)
    openrouter_use_transforms: bool = True  # Enable middle-out compression for long contexts
    
    # CORS Settings
    allowed_origins: list[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://54.144.220.40:8000",  # EC2 backend
        "https://*.vercel.app",  # Vercel deployment domains
        "https://t3-chat-clone-dc22kjqzl-hamdi-barkous-projects.vercel.app",  # Your actual Vercel domain
        "*"  # Allow all origins for now (change this in production)
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
