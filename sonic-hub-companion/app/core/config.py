from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sonichub"

    # Claude API
    anthropic_api_key: str = ""
    claude_chat_model: str = "claude-haiku-4-5-20251001"
    claude_smart_model: str = "claude-sonnet-4-6"

    # Sonic Hub API
    sonic_hub_api_url: str = "http://localhost:8080"

    # Timezone
    user_timezone: str = "Asia/Ho_Chi_Minh"

    # Server
    port: int = 8082

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
