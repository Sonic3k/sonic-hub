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

@router.post("/reset", response_model=dict)
async def reset_all(db: AsyncSession = Depends(get_db)):
    """Delete ALL companion data and reseed from scratch."""
    from app.models.models import (
        Message, Conversation, Episode, UserProfile, Personality,
        Channel, Assistant, Vocabulary, Dynamics
    )
    # Delete in order (respect FK constraints)
    await db.execute(Message.__table__.delete())
    await db.execute(Conversation.__table__.delete())
    await db.execute(Episode.__table__.delete())
    await db.execute(UserProfile.__table__.delete())
    await db.execute(Personality.__table__.delete())
    await db.execute(Vocabulary.__table__.delete())
    await db.execute(Dynamics.__table__.delete())
    await db.execute(Channel.__table__.delete())
    await db.execute(Assistant.__table__.delete())
    await db.commit()

    # Reseed
    from app.seed import seed_with_session
    result = await seed_with_session(db)
    return {
        "status": "reset_complete",
        "message": "All data deleted and reseeded",
        "seed_result": result,
    }


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


# ─── Vocabulary ───

@router.get("/vocabulary/{assistant_id}")
async def get_vocabulary(assistant_id: str, db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_vocabulary(db, assistant_id)
    return [
        {"id": str(v.id), "phrase": v.phrase, "context": v.context, "frequency": v.frequency}
        for v in items
    ]


@router.post("/vocabulary")
async def add_vocabulary(request: dict, db: AsyncSession = Depends(get_db)):
    await memory_service.save_vocabulary(
        db, assistant_id=request["assistant_id"],
        phrase=request["phrase"],
        context=request.get("context"),
        frequency=request.get("frequency", "common"),
    )
    await db.commit()
    return {"status": "added", "phrase": request["phrase"]}


@router.delete("/vocabulary/{vocab_id}")
async def delete_vocabulary(vocab_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import Vocabulary
    result = await db.execute(select(Vocabulary).where(Vocabulary.id == vocab_id))
    v = result.scalar_one_or_none()
    if v:
        await db.delete(v)
        await db.commit()
    return {"status": "deleted"}


# ─── Dynamics ───

@router.get("/dynamics/{assistant_id}")
async def get_dynamics(assistant_id: str, db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_dynamics(db, assistant_id)
    return [
        {"id": str(d.id), "period": d.period, "description": d.description, "sentiment": d.sentiment}
        for d in items
    ]


@router.post("/dynamics")
async def add_dynamics(request: dict, db: AsyncSession = Depends(get_db)):
    await memory_service.save_dynamics(
        db, assistant_id=request["assistant_id"],
        period=request["period"],
        description=request["description"],
        sentiment=request.get("sentiment"),
    )
    await db.commit()
    return {"status": "added"}


@router.delete("/dynamics/{dynamics_id}")
async def delete_dynamics(dynamics_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import Dynamics
    result = await db.execute(select(Dynamics).where(Dynamics.id == dynamics_id))
    d = result.scalar_one_or_none()
    if d:
        await db.delete(d)
        await db.commit()
    return {"status": "deleted"}


# ─── Manual Import (batch) ───

@router.post("/manual-import/{assistant_id}")
async def manual_import(assistant_id: str, request: dict, db: AsyncSession = Depends(get_db)):
    """Import facts, episodes, vocabulary, dynamics manually."""
    counts = {"facts": 0, "episodes": 0, "vocabulary": 0, "dynamics": 0}

    for fact in request.get("facts", []):
        if fact.get("key") and fact.get("value"):
            await memory_service.upsert_profile_fact(
                db, assistant_id, fact.get("category", "general"),
                fact["key"], fact["value"],
            )
            counts["facts"] += 1

    for ep in request.get("episodes", []):
        if ep.get("summary"):
            occurred = None
            if ep.get("date"):
                try:
                    from datetime import datetime
                    occurred = datetime.strptime(ep["date"], "%Y-%m-%d")
                except ValueError:
                    pass
            await memory_service.save_episode(
                db, assistant_id, ep["summary"],
                emotion=ep.get("emotion"), importance=ep.get("importance", 5),
                occurred_at=occurred,
            )
            counts["episodes"] += 1

    for v in request.get("vocabulary", []):
        if v.get("phrase"):
            await memory_service.save_vocabulary(
                db, assistant_id, v["phrase"],
                context=v.get("context"), frequency=v.get("frequency", "common"),
            )
            counts["vocabulary"] += 1

    for d in request.get("dynamics", []):
        if d.get("description"):
            await memory_service.save_dynamics(
                db, assistant_id, d.get("period", ""), d["description"],
                sentiment=d.get("sentiment"),
            )
            counts["dynamics"] += 1

    await db.commit()
    return {"status": "imported", "counts": counts}


# ─── Import Job Tracker ───

import_jobs: dict = {}  # job_id -> {status, progress, result}


# ─── Import Chat History ───

@router.post("/import/yahoo-messenger/{assistant_id}", response_model=dict)
async def import_yahoo_messenger(
    assistant_id: str,
    file: UploadFile = File(...),
):
    """Import Yahoo Messenger chat history. Returns immediately, extraction runs in background."""
    import asyncio
    import uuid as uuid_mod
    from app.import_chat import parse_ym_chat_from_text, import_conversations

    try:
        raw_bytes = await file.read()
        try:
            text = raw_bytes.decode('utf-16')
        except (UnicodeDecodeError, UnicodeError):
            text = raw_bytes.decode('utf-8-sig')

        conversations = parse_ym_chat_from_text(text)

        async with async_session() as db:
            channel = await memory_service.get_or_create_channel(db, "yahoo_messenger", "hypersonic3k")
            await db.commit()
            channel_id = channel.id

        imported = await import_conversations(conversations, assistant_id, channel_id)

        # Create job for background extraction
        job_id = str(uuid_mod.uuid4())[:8]
        import_jobs[job_id] = {
            "status": "extracting",
            "progress": "Starting memory extraction...",
            "messages_imported": imported,
            "conversations": len(conversations),
        }

        asyncio.create_task(
            _extract_memories_background(conversations, assistant_id, job_id)
        )

        return {
            "status": "success",
            "job_id": job_id,
            "conversations": len(conversations),
            "messages_imported": imported,
            "message": f"Imported {imported} messages. Extraction started (job: {job_id})",
        }
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e)}


@router.get("/import/status/{job_id}", response_model=dict)
async def import_status(job_id: str):
    """Poll extraction job status."""
    job = import_jobs.get(job_id)
    if not job:
        return {"status": "not_found"}
    return job


async def _extract_memories_background(conversations, assistant_id, job_id: str):
    """Background task for memory extraction with progress tracking."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        from app.import_chat import extract_memories_batch
        result = await extract_memories_batch(
            conversations, assistant_id,
            progress_callback=lambda msg: import_jobs.update({job_id: {**import_jobs.get(job_id, {}), "progress": msg, "status": "extracting"}}),
        )
        import_jobs[job_id] = {
            **import_jobs.get(job_id, {}),
            "status": "done",
            "progress": "Complete!",
            "result": result,
        }
        logger.info(f"Job {job_id} done: {result}")
    except Exception as e:
        import_jobs[job_id] = {
            **import_jobs.get(job_id, {}),
            "status": "error",
            "progress": f"Error: {str(e)}",
        }
        logger.error(f"Job {job_id} failed: {e}")


# ─── Health ───

@router.get("/actuator/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="UP", service="sonic-hub-companion", version="0.1.0"
    )
