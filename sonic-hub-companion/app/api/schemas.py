from pydantic import BaseModel
from datetime import datetime


class ChatRequest(BaseModel):
    channel: str  # telegram, web, zalo
    external_id: str  # telegram chat_id, user session id, etc.
    message: str
    timestamp: datetime | None = None
    metadata: dict | None = None


class ChatResponse(BaseModel):
    reply: str
    typing_delay_ms: int
    split: list[str]
    conversation_id: str


class PersonalityRequest(BaseModel):
    aspect: str  # tone, language, boundary, habit, identity
    instruction: str
    examples: dict | None = None


class PersonalityResponse(BaseModel):
    aspect: str
    instruction: str
    examples: dict | None
    version: int
    active: bool


class ProfileFactRequest(BaseModel):
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
