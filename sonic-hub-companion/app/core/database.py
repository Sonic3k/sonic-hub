from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(get_settings().database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-migrate: add missing columns to existing tables
    async with engine.begin() as conn:
        migrations = [
            "ALTER TABLE companion_user_profile ADD COLUMN IF NOT EXISTS period VARCHAR(50)",
            "ALTER TABLE companion_assistants ADD COLUMN IF NOT EXISTS date_of_birth DATE",
            "ALTER TABLE companion_assistants ADD COLUMN IF NOT EXISTS bio TEXT",
            "ALTER TABLE companion_conversations ADD COLUMN IF NOT EXISTS assistant_id UUID",
            # Drop old unique index if exists, new one includes period
            "DROP INDEX IF EXISTS idx_profile_assistant_key",
        ]
        for sql in migrations:
            try:
                await conn.execute(text(sql))
            except Exception:
                pass  # column already exists or table doesn't exist yet
