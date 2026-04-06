from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, async_session
from app.api.schemas import (
    ChatRequest, ChatResponse,
    AssistantCreateRequest, AssistantResponse,
    PersonalityRequest, PersonalityResponse,
    ProfileFactRequest, ProfileFactResponse,
    EpisodeResponse, HealthResponse, ConversationResponse, MessageResponse,
)
from app.services.chat import ChatService
from app.services.memory import MemoryService
from app.models.models import Assistant, Conversation, Message

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


# ─── Seed ───

@router.post("/seed", response_model=dict)
async def run_seed(db: AsyncSession = Depends(get_db)):
    """Run seed to create default assistant (Tommy Filan) if none exists."""
    from app.seed import seed_with_session
    result = await seed_with_session(db)
    return result


@router.post("/reseed/{assistant_id}", response_model=dict)
async def reseed_personality(assistant_id: str, db: AsyncSession = Depends(get_db)):
    """Force update personality + profile for existing assistant based on latest seed data."""
    from datetime import date as date_type
    from app.seed import PERSONALITY_SEED, PROFILE_SEED

    assistant = await memory_service.get_assistant_by_id(db, assistant_id)
    if not assistant:
        return {"status": "error", "message": "Assistant not found"}

    # Update assistant info
    assistant.date_of_birth = date_type(1993, 5, 28)
    assistant.bio = (
        "Fan Westlife. Tốt nghiệp KTQD ngành marketing. "
        "Nhẹ nhàng, lễ phép, hay dùng 'ạ' cuối câu. "
        "Quen Ngọc Anh qua fan club Westlife v-west từ thời sinh viên."
    )

    # Update personality
    for p in PERSONALITY_SEED:
        await memory_service.upsert_personality(
            db, assistant_id=assistant.id,
            aspect=p["aspect"],
            instruction=p["instruction"],
            examples=p.get("examples"),
        )

    # Update profile
    for category, key, value in PROFILE_SEED:
        await memory_service.upsert_profile_fact(db, assistant.id, category, key, value)

    await db.commit()
    return {
        "status": "updated",
        "message": f"Personality + profile reseeded for {assistant.nickname}",
        "aspects": len(PERSONALITY_SEED),
        "facts": len(PROFILE_SEED),
    }


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


@router.post("/assistants", response_model=AssistantResponse)
async def create_assistant(request: AssistantCreateRequest, db: AsyncSession = Depends(get_db)):
    from datetime import date as date_type
    dob = None
    if request.date_of_birth:
        dob = date_type.fromisoformat(request.date_of_birth)
    a = Assistant(
        name=request.name, nickname=request.nickname,
        date_of_birth=dob, bio=request.bio, active=True,
    )
    db.add(a)
    await db.commit()
    return AssistantResponse(
        id=str(a.id), name=a.name, nickname=a.nickname,
        avatar_url=a.avatar_url, date_of_birth=a.date_of_birth,
        bio=a.bio, active=a.active,
    )


@router.delete("/assistants/{assistant_id}", response_model=dict)
async def delete_assistant(assistant_id: str, db: AsyncSession = Depends(get_db)):
    a = await memory_service.get_assistant_by_id(db, assistant_id)
    if a:
        await db.delete(a)
        await db.commit()
    return {"status": "deleted", "id": assistant_id}


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


# ─── Conversations ───

@router.get("/conversations/{assistant_id}", response_model=list[ConversationResponse])
async def get_conversations(
    assistant_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import desc
    result = await db.execute(
        select(Conversation)
        .where(Conversation.assistant_id == assistant_id)
        .order_by(desc(Conversation.started_at))
        .limit(limit)
    )
    convs = list(result.scalars().all())
    return [
        ConversationResponse(
            id=str(c.id), started_at=c.started_at,
            ended_at=c.ended_at, summary=c.summary, is_active=c.is_active,
        )
        for c in convs
    ]


@router.get("/conversations/{assistant_id}/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_conversation_messages(
    assistant_id: str, conversation_id: str, db: AsyncSession = Depends(get_db)
):
    messages = await memory_service.get_recent_messages(db, conversation_id, limit=100)
    return [
        MessageResponse(
            id=str(m.id), role=m.role, content=m.content,
            timestamp=m.timestamp, channel_type=m.channel_type,
        )
        for m in messages
    ]


# ─── Import Chat History ───

@router.post("/import/yahoo-messenger/{assistant_id}", response_model=dict)
async def import_yahoo_messenger(
    assistant_id: str,
    file: UploadFile = File(...),
):
    """Import Yahoo Messenger chat history from uploaded .txt file."""
    from app.import_chat import parse_ym_chat_from_text, import_conversations, extract_memories_batch

    try:
        raw_bytes = await file.read()
        # Try UTF-16 first, then UTF-8
        try:
            text = raw_bytes.decode('utf-16')
        except (UnicodeDecodeError, UnicodeError):
            text = raw_bytes.decode('utf-8-sig')

        conversations = parse_ym_chat_from_text(text)
        total_msgs = sum(len(c['messages']) for c in conversations)

        async with async_session() as db:
            channel = await memory_service.get_or_create_channel(db, "yahoo_messenger", "hypersonic3k")
            await db.commit()
            channel_id = channel.id

        imported = await import_conversations(conversations, assistant_id, channel_id)
        facts_count, episodes_count = await extract_memories_batch(conversations, assistant_id)

        return {
            "status": "success",
            "conversations": len(conversations),
            "messages_imported": imported,
            "facts_extracted": facts_count,
            "episodes_extracted": episodes_count,
        }
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "trace": traceback.format_exc()}


# ─── Health ───

@router.get("/actuator/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="UP", service="sonic-hub-companion", version="0.1.0"
    )
