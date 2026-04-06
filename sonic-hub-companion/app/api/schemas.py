from pydantic import BaseModel
from datetime import datetime, date


class ChatRequest(BaseModel):
    channel: str
    external_id: str
    message: str
    assistant_id: str | None = None
    timestamp: datetime | None = None
    metadata: dict | None = None


class ChatResponse(BaseModel):
    reply: str
    typing_delay_ms: int
    split: list[str]
    conversation_id: str
    assistant_id: str
    assistant_nickname: str


class AssistantCreateRequest(BaseModel):
    name: str
    nickname: str
    date_of_birth: str | None = None
    bio: str | None = None
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    telegram_owner_id: str | None = None


class AssistantUpdateRequest(BaseModel):
    name: str | None = None
    nickname: str | None = None
    bio: str | None = None
    telegram_bot_token: str | None = None
    telegram_bot_username: str | None = None
    telegram_enabled: bool | None = None
    telegram_owner_id: str | None = None


class AssistantResponse(BaseModel):
    id: str
    name: str
    nickname: str
    avatar_url: str | None
    date_of_birth: date | None
    bio: str | None
    active: bool
    telegram_bot_username: str | None
    telegram_enabled: bool
    telegram_owner_id: str | None


class PersonalityRequest(BaseModel):
    assistant_id: str
    aspect: str
    instruction: str
    examples: dict | None = None


class PersonalityResponse(BaseModel):
    aspect: str
    instruction: str
    examples: dict | None
    version: int
    active: bool


class ProfileFactRequest(BaseModel):
    assistant_id: str
    category: str
    key: str
    value: str
    period: str | None = None


class ProfileFactResponse(BaseModel):
    category: str
    key: str
    value: str
    period: str | None
    confidence: float
    updated_at: datetime


class EpisodeResponse(BaseModel):
    summary: str
    emotion: str | None
    importance: int
    occurred_at: datetime


class ConversationResponse(BaseModel):
    id: str
    started_at: datetime
    ended_at: datetime | None
    summary: str | None
    is_active: bool


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: datetime
    channel_type: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
