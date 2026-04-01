from collections.abc import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings
from .models.base import Base


engine = create_async_engine(settings.database_url, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


async def init_database() -> None:
    """Verify database connectivity; schema is managed via Alembic migrations."""

    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a SQLAlchemy session."""

    async with SessionLocal() as session:
        yield session
