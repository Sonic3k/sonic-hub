from pydantic import BaseModel
from datetime import datetime, date


class ChatRequest(BaseModel):
    channel: str
    external_id: str
    message: str
    assistant_id: str | None = None  # if None, use default active assistant
    timestamp: datetime | None = None
    metadata: dict | None = None


class ChatResponse(BaseModel):
    reply: str
    typing_delay_ms: int
    split: list[str]
    conversation_id: str
    assistant_id: str
    assistant_nickname: str


class AssistantResponse(BaseModel):
    id: str
    name: str
    nickname: str
    avatar_url: str | None
    date_of_birth: date | None
    bio: str | None
    active: bool


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


class ProfileFactResponse(BaseModel):
    category: str
    key: str
    value: str
    confidence: float
    updated_at: datetime


class EpisodeResponse(BaseModel):
    summary: str
    emotion: str | None
    importance: int
    occurred_at: datetime


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
