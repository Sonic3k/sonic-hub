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
    messages: list[str]
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
    id: str
    category: str
    key: str
    value: str
    period: str | None
    confidence: float
    updated_at: datetime


class EpisodeResponse(BaseModel):
    id: str
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


class ChatConfigResponse(BaseModel):
    debounce_seconds: float
    response_delay_min: float
    response_delay_max: float
    typing_speed_short: float
    typing_speed_medium: float
    typing_speed_long: float
    typing_speed_xlong: float
    quick_reactions: list[str] | None
    quick_reaction_delay: float
    max_messages_per_reply: int
    reply_count_weights: list[int] | None
    notes: str | None


class ChatConfigUpdateRequest(BaseModel):
    debounce_seconds: float | None = None
    response_delay_min: float | None = None
    response_delay_max: float | None = None
    typing_speed_short: float | None = None
    typing_speed_medium: float | None = None
    typing_speed_long: float | None = None
    typing_speed_xlong: float | None = None
    quick_reactions: list[str] | None = None
    quick_reaction_delay: float | None = None
    max_messages_per_reply: int | None = None
    reply_count_weights: list[int] | None = None
    notes: str | None = None
