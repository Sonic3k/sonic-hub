from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.schemas import (
    ChatRequest, ChatResponse,
    AssistantResponse,
    PersonalityRequest, PersonalityResponse,
    ProfileFactRequest, ProfileFactResponse,
    EpisodeResponse, HealthResponse,
)
from app.services.chat import ChatService
from app.services.memory import MemoryService

router = APIRouter()
chat_service = ChatService()
memory_service = MemoryService()


# ─── Chat ───

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await chat_service.handle_message(
        db=db,
        channel_type=request.channel,
        external_id=request.external_id,
        user_message=request.message,
        assistant_id=request.assistant_id,
        metadata=request.metadata,
    )
    return ChatResponse(**result)


# ─── Assistants ───

@router.get("/assistants", response_model=list[AssistantResponse])
async def list_assistants(db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_all_assistants(db)
    return [
        AssistantResponse(
            id=str(a.id), name=a.name, nickname=a.nickname,
            avatar_url=a.avatar_url, date_of_birth=a.date_of_birth,
            bio=a.bio, active=a.active,
        )
        for a in items
    ]


# ─── Personality ───

@router.get("/personality/{assistant_id}", response_model=list[PersonalityResponse])
async def get_personality(assistant_id: str, db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_active_personality(db, assistant_id)
    return [
        PersonalityResponse(
            aspect=p.aspect, instruction=p.instruction,
            examples=p.examples, version=p.version, active=p.active,
        )
        for p in items
    ]


@router.put("/personality", response_model=dict)
async def update_personality(
    request: PersonalityRequest, db: AsyncSession = Depends(get_db)
):
    await memory_service.upsert_personality(
        db, assistant_id=request.assistant_id,
        aspect=request.aspect, instruction=request.instruction,
        examples=request.examples,
    )
    await db.commit()
    return {"status": "updated", "aspect": request.aspect}


# ─── Profile ───

@router.get("/profile/{assistant_id}", response_model=list[ProfileFactResponse])
async def get_profile(assistant_id: str, db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_user_profile(db, assistant_id)
    return [
        ProfileFactResponse(
            category=p.category, key=p.key, value=p.value,
            confidence=p.confidence, updated_at=p.updated_at,
        )
        for p in items
    ]


@router.put("/profile", response_model=dict)
async def update_profile(
    request: ProfileFactRequest, db: AsyncSession = Depends(get_db)
):
    await memory_service.upsert_profile_fact(
        db, assistant_id=request.assistant_id,
        category=request.category, key=request.key, value=request.value,
    )
    await db.commit()
    return {"status": "updated", "key": request.key}


# ─── Episodes ───

@router.get("/episodes/{assistant_id}", response_model=list[EpisodeResponse])
async def get_episodes(
    assistant_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)
):
    items = await memory_service.get_recent_episodes(db, assistant_id, limit=limit)
    return [
        EpisodeResponse(
            summary=e.summary, emotion=e.emotion,
            importance=e.importance, occurred_at=e.occurred_at,
        )
        for e in items
    ]


# ─── Health ───

@router.get("/actuator/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="UP", service="sonic-hub-companion", version="0.1.0"
    )
