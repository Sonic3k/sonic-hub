from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.schemas import (
    ChatRequest, ChatResponse,
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
        metadata=request.metadata,
    )
    return ChatResponse(**result)


# ─── Personality ───

@router.get("/personality", response_model=list[PersonalityResponse])
async def get_personality(db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_active_personality(db)
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
        db, aspect=request.aspect,
        instruction=request.instruction, examples=request.examples,
    )
    await db.commit()
    return {"status": "updated", "aspect": request.aspect}


# ─── Profile ───

@router.get("/profile", response_model=list[ProfileFactResponse])
async def get_profile(db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_user_profile(db)
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
        db, category=request.category, key=request.key, value=request.value,
    )
    await db.commit()
    return {"status": "updated", "key": request.key}


# ─── Episodes ───

@router.get("/episodes", response_model=list[EpisodeResponse])
async def get_episodes(limit: int = 20, db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_recent_episodes(db, limit=limit)
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
