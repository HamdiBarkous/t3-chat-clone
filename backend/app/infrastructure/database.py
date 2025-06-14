from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData
from typing import AsyncGenerator
from app.core.config import settings

# Create the async engine with optimized settings
engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.debug,
    future=True,
    # Connection pool settings for better performance
    pool_size=20,  # Number of connections to maintain
    max_overflow=30,  # Additional connections when pool is full
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,  # Recycle connections after 1 hour
    # Query optimization settings
    connect_args={
        "server_settings": {
            "jit": "off",  # Disable JIT for better latency
            "application_name": "t3-chat-backend",
        },
        "command_timeout": 30,  # 30 second timeout for commands
        "prepared_statement_cache_size": 100,  # Cache prepared statements
    }
)

# Create async session factory with optimized settings
AsyncSessionLocal = async_sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    # Performance optimizations
    autoflush=False,  # Manual control over flushing
    autocommit=False
)

# Create base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Optimized dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_session_no_autocommit() -> AsyncGenerator[AsyncSession, None]:
    """Database session for batch operations without auto-commit"""
    async with AsyncSessionLocal() as session:
        try:
            # Disable autocommit for batch operations
            session.begin()
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close() 