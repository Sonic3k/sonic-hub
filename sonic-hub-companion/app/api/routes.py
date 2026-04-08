import asyncio
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, async_session
from app.api.schemas import (
    ChatRequest, ChatResponse,
    AssistantCreateRequest, AssistantUpdateRequest, AssistantResponse,
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

@router.post("/chat")
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    result = await chat_service.handle_message(
        db=db,
        channel_type=request.channel,
        external_id=request.external_id,
        user_messages=request.message,
        assistant_id=request.assistant_id,
        metadata=request.metadata,
    )
    return result


# ─── Seed ───

@router.post("/reset", response_model=dict)
async def reset_all(db: AsyncSession = Depends(get_db)):
    """Delete ALL companion data and reseed from scratch."""
    from app.models.models import (
        Message, Conversation, Episode, UserProfile, Personality,
        Channel, Assistant, Vocabulary, Dynamics, BackgroundJob, ChatConfig,
        ConversationState
    )
    # Delete in order (respect FK constraints)
    await db.execute(BackgroundJob.__table__.delete())
    await db.execute(Message.__table__.delete())
    await db.execute(Conversation.__table__.delete())
    await db.execute(Episode.__table__.delete())
    await db.execute(UserProfile.__table__.delete())
    await db.execute(Personality.__table__.delete())
    await db.execute(Vocabulary.__table__.delete())
    await db.execute(Dynamics.__table__.delete())
    await db.execute(ChatConfig.__table__.delete())
    await db.execute(ConversationState.__table__.delete())
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

    # Create/update chat config
    await memory_service.upsert_chat_config(
        db, assistant.id,
        debounce_seconds=10.0,
        response_delay_min=6.0,
        response_delay_max=17.0,
        typing_speed_short=1.0,
        typing_speed_medium=3.0,
        typing_speed_long=5.0,
        typing_speed_xlong=9.0,
        quick_reactions=["vâng", "@@", "dạ", "oack", "oh", "=.=", "hizhiz", "dạ??", "dạ k", "T__T"],
        quick_reaction_delay=1.5,
        max_messages_per_reply=3,
        reply_count_weights=[48, 27, 14, 6],
    )

    await db.commit()
    return {
        "status": "updated",
        "message": f"Personality + profile reseeded for {assistant.nickname}",
        "aspects": len(PERSONALITY_SEED),
        "facts": len(PROFILE_SEED),
    }


@router.post("/supplement/{assistant_id}", response_model=dict)
async def import_supplement(assistant_id: str, db: AsyncSession = Depends(get_db)):
    """Import curated supplementary data (vocabulary, dynamics, historical facts) from chat analysis."""
    from app.supplement_data import VOCABULARY_DATA, DYNAMICS_DATA, HISTORICAL_FACTS

    assistant = await memory_service.get_assistant_by_id(db, assistant_id)
    if not assistant:
        return {"status": "error", "message": "Assistant not found"}

    counts = {"vocabulary": 0, "dynamics": 0, "facts": 0}

    for v in VOCABULARY_DATA:
        await memory_service.save_vocabulary(
            db, assistant.id, phrase=v["phrase"], context=v["context"],
        )
        counts["vocabulary"] += 1

    for d in DYNAMICS_DATA:
        await memory_service.save_dynamics(
            db, assistant.id, period=d["period"],
            description=d["description"], sentiment=d["sentiment"],
        )
        counts["dynamics"] += 1

    for f in HISTORICAL_FACTS:
        await memory_service.upsert_profile_fact(
            db, assistant.id, category=f["category"],
            key=f["key"], value=f["value"], period=f.get("period"),
        )
        counts["facts"] += 1

    await db.commit()
    return {
        "status": "imported",
        "message": f"Supplementary data imported: {counts['vocabulary']} vocab, {counts['dynamics']} dynamics, {counts['facts']} facts",
        **counts,
    }


# ─── Assistants ───

def _assistant_response(a) -> AssistantResponse:
    return AssistantResponse(
        id=str(a.id), name=a.name, nickname=a.nickname,
        avatar_url=a.avatar_url, date_of_birth=a.date_of_birth,
        bio=a.bio, active=a.active,
        telegram_bot_username=a.telegram_bot_username,
        telegram_enabled=a.telegram_enabled or False,
        telegram_owner_id=a.telegram_owner_id,
        llm_provider=a.llm_provider or "claude",
        llm_model=a.llm_model,
    )


@router.get("/assistants", response_model=list[AssistantResponse])
async def list_assistants(db: AsyncSession = Depends(get_db)):
    items = await memory_service.get_all_assistants(db)
    return [_assistant_response(a) for a in items]


@router.post("/assistants", response_model=AssistantResponse)
async def create_assistant(request: AssistantCreateRequest, db: AsyncSession = Depends(get_db)):
    from datetime import date as date_type
    dob = None
    if request.date_of_birth:
        dob = date_type.fromisoformat(request.date_of_birth)
    a = Assistant(
        name=request.name, nickname=request.nickname,
        date_of_birth=dob, bio=request.bio, active=True,
        telegram_bot_token=request.telegram_bot_token,
        telegram_bot_username=request.telegram_bot_username,
        telegram_owner_id=request.telegram_owner_id,
    )
    db.add(a)
    await db.commit()
    return _assistant_response(a)


@router.put("/assistants/{assistant_id}", response_model=AssistantResponse)
async def update_assistant(
    assistant_id: str, request: AssistantUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    a = await memory_service.get_assistant_by_id(db, assistant_id)
    if not a:
        return {"status": "error", "message": "Not found"}

    if request.name is not None: a.name = request.name
    if request.nickname is not None: a.nickname = request.nickname
    if request.bio is not None: a.bio = request.bio
    if request.telegram_bot_token is not None: a.telegram_bot_token = request.telegram_bot_token
    if request.telegram_bot_username is not None: a.telegram_bot_username = request.telegram_bot_username
    if request.telegram_owner_id is not None: a.telegram_owner_id = request.telegram_owner_id
    if request.telegram_enabled is not None: a.telegram_enabled = request.telegram_enabled
    if request.llm_provider is not None: a.llm_provider = request.llm_provider
    if request.llm_model is not None: a.llm_model = request.llm_model

    await db.commit()

    # Restart bot if telegram config changed
    from app.services.telegram import bot_manager
    await bot_manager.restart_bot(assistant_id)

    return _assistant_response(a)


@router.delete("/assistants/{assistant_id}", response_model=dict)
async def delete_assistant(assistant_id: str, db: AsyncSession = Depends(get_db)):
    from app.services.telegram import bot_manager
    await bot_manager.stop_bot(assistant_id)
    a = await memory_service.get_assistant_by_id(db, assistant_id)
    if a:
        await db.delete(a)
        await db.commit()
    return {"status": "deleted", "id": assistant_id}


# ─── Telegram Bot Management ───

@router.get("/telegram/status")
async def telegram_status():
    from app.services.telegram import bot_manager
    return {"bots": bot_manager.get_status()}


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
            id=str(p.id), category=p.category, key=p.key, value=p.value,
            period=p.period, confidence=p.confidence, updated_at=p.updated_at,
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
        period=request.period,
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
            id=str(e.id), summary=e.summary, emotion=e.emotion,
            importance=e.importance, occurred_at=e.occurred_at,
        )
        for e in items
    ]


@router.delete("/profile/fact/{fact_id}")
async def delete_profile_fact(fact_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import UserProfile
    result = await db.execute(select(UserProfile).where(UserProfile.id == fact_id))
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return {"status": "deleted"}


@router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import Episode
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return {"status": "deleted"}


@router.delete("/personality/{assistant_id}/{aspect}")
async def delete_personality(assistant_id: str, aspect: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import Personality
    result = await db.execute(
        select(Personality).where(
            Personality.assistant_id == assistant_id,
            Personality.aspect == aspect,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return {"status": "deleted"}


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


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    from app.models.models import Message as MsgModel
    # Delete messages first (FK)
    await db.execute(MsgModel.__table__.delete().where(MsgModel.conversation_id == conversation_id))
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if conv:
        await db.delete(conv)
    await db.commit()
    return {"status": "deleted"}


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


# ─── Import Job Tracker (DB-based) ───

async def _get_or_create_job(db: AsyncSession, job_id: str, job_type: str) -> 'BackgroundJob':
    from app.models.models import BackgroundJob
    result = await db.execute(select(BackgroundJob).where(BackgroundJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        job = BackgroundJob(id=job_id, type=job_type, status="pending")
        db.add(job)
        await db.flush()
    return job


async def _update_job(job_id: str, status: str, progress: str = None, result_data: dict = None):
    from app.models.models import BackgroundJob
    async with async_session() as db:
        res = await db.execute(select(BackgroundJob).where(BackgroundJob.id == job_id))
        job = res.scalar_one_or_none()
        if job:
            job.status = status
            if progress:
                job.progress = progress
            if result_data:
                job.result = result_data
            await db.commit()


# ─── Import Chat History ───

@router.post("/import/yahoo-messenger/{assistant_id}", response_model=dict)
async def import_yahoo_messenger(
    assistant_id: str,
    file: UploadFile = File(...),
):
    """Import Yahoo Messenger chat history. ONLY imports messages, no extraction."""
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

        return {
            "status": "success",
            "conversations": len(conversations),
            "messages_imported": imported,
            "message": f"Imported {imported} messages from {len(conversations)} conversations.",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ─── Extract Memories ───

@router.post("/extract/{assistant_id}", response_model=dict)
async def extract_memories(assistant_id: str):
    """Extract memories from already-imported conversations. Runs in background."""
    import uuid as uuid_mod
    from sqlalchemy import desc

    # Load conversations from DB
    async with async_session() as db:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.assistant_id == assistant_id)
            .order_by(Conversation.started_at)
        )
        convs = list(result.scalars().all())

        if not convs:
            return {"status": "error", "message": "No conversations found. Import chat history first."}

        # Rebuild conversation format for extraction
        conversations = []
        for conv in convs:
            msgs = await memory_service.get_recent_messages(db, conv.id, limit=500)
            if not msgs:
                continue
            conversations.append({
                "date": conv.started_at,
                "messages": [
                    {
                        "role": m.role,
                        "content": m.content,
                        "timestamp": m.timestamp,
                        "sender": "Tommy Filan" if m.role == "assistant" else "hypersonic3k",
                    }
                    for m in msgs
                ],
            })

    if not conversations:
        return {"status": "error", "message": "No messages found in conversations."}

    # Create background job
    job_id = str(uuid_mod.uuid4())[:8]
    async with async_session() as jdb:
        await _get_or_create_job(jdb, job_id, "extract_memories")
        await jdb.commit()

    asyncio.create_task(
        _extract_memories_background(conversations, assistant_id, job_id)
    )

    return {
        "status": "started",
        "job_id": job_id,
        "conversations": len(conversations),
        "message": f"Extracting from {len(conversations)} conversations (job: {job_id})",
    }


@router.get("/jobs/{job_id}", response_model=dict)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Poll any background job status."""
    from app.models.models import BackgroundJob
    result = await db.execute(select(BackgroundJob).where(BackgroundJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        return {"status": "not_found"}
    return {
        "id": job.id,
        "type": job.type,
        "status": job.status,
        "progress": job.progress,
        "result": job.result,
        "created_at": str(job.created_at),
    }


async def _extract_memories_background(conversations, assistant_id, job_id: str):
    """Background task for memory extraction with progress tracking."""
    import logging
    logger = logging.getLogger(__name__)
    try:
        await _update_job(job_id, "running", "Starting extraction...")
        from app.import_chat import extract_memories_batch
        result = await extract_memories_batch(
            conversations, assistant_id,
            progress_callback=lambda msg: asyncio.ensure_future(_update_job(job_id, "running", msg)),
        )
        await _update_job(job_id, "done", "Complete!", result)
        logger.info(f"Job {job_id} done: {result}")
    except Exception as e:
        await _update_job(job_id, "error", f"Error: {str(e)}")
        logger.error(f"Job {job_id} failed: {e}")


# ─── Chat Config ───

@router.get("/chat-config/{assistant_id}")
async def get_chat_config(assistant_id: str, db: AsyncSession = Depends(get_db)):
    config = await memory_service.get_chat_config(db, assistant_id)
    if not config:
        return {"status": "not_found", "message": "No chat config. Run seed or create one."}
    return {
        "debounce_seconds": config.debounce_seconds,
        "response_delay_min": config.response_delay_min,
        "response_delay_max": config.response_delay_max,
        "typing_speed_short": config.typing_speed_short,
        "typing_speed_medium": config.typing_speed_medium,
        "typing_speed_long": config.typing_speed_long,
        "typing_speed_xlong": config.typing_speed_xlong,
        "quick_reactions": config.quick_reactions,
        "quick_reaction_delay": config.quick_reaction_delay,
        "max_messages_per_reply": config.max_messages_per_reply,
        "reply_count_weights": config.reply_count_weights,
        "notes": config.notes,
    }


@router.put("/chat-config/{assistant_id}")
async def update_chat_config(assistant_id: str, request: dict, db: AsyncSession = Depends(get_db)):
    await memory_service.upsert_chat_config(db, assistant_id, **request)
    await db.commit()
    return {"status": "updated"}


# ─── LLM Providers ───

@router.get("/llm/providers")
async def get_llm_providers():
    from app.services.providers import PROVIDER_MODELS
    return PROVIDER_MODELS


# ─── Debug ───

@router.get("/debug/integration")
async def debug_integration():
    """Test sonic-hub-api connectivity and companion config."""
    from app.services import hub_client
    from app.core.config import get_settings

    settings = get_settings()
    results = {
        "sonic_hub_api_url": settings.sonic_hub_api_url,
        "claude_chat_model": settings.claude_chat_model,
        "claude_smart_model": settings.claude_smart_model,
        "together_api_key_set": bool(settings.together_api_key),
        "together_api_key_prefix": settings.together_api_key[:10] + "..." if settings.together_api_key else None,
        "openai_api_key_set": bool(settings.openai_api_key),
    }

    # Test API connectivity
    try:
        tasks = await hub_client.get_tasks()
        results["api_reachable"] = True
        results["tasks_count"] = len(tasks) if tasks else 0
    except Exception as e:
        results["api_reachable"] = False
        results["api_error"] = str(e)

    # Test context pull
    try:
        ctx = await hub_client.get_companion_context()
        results["context_keys"] = list(ctx.keys()) if ctx else []
    except Exception as e:
        results["context_error"] = str(e)

    # Test Together API if key set
    if settings.together_api_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.together_api_key, base_url="https://api.together.xyz/v1")
            resp = await client.chat.completions.create(
                model="meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
                max_tokens=20,
                messages=[{"role": "user", "content": "say ok"}],
            )
            results["together_reachable"] = True
            results["together_raw"] = resp.choices[0].message.content[:100]
        except Exception as e:
            results["together_reachable"] = False
            results["together_error"] = f"{type(e).__name__}: {e}"

    # Show assistant LLM configs
    try:
        async with async_session() as db:
            assistants = await memory_service.get_all_assistants(db)
            results["assistants_llm"] = [
                {"nickname": a.nickname, "llm_provider": a.llm_provider, "llm_model": a.llm_model}
                for a in assistants
            ]
    except Exception:
        pass

    return results


@router.post("/debug/test-llm")
async def debug_test_llm(message: str = "tối nay 10h phải trả dây sạc"):
    """Test LLM response format with a sample message."""
    from app.services.llm import LLMService
    llm = LLMService()

    system = """Bạn là Tommy. Trả lời PHẢI là JSON:
{"messages": [{"text": "..."}], "actions": []}
Nếu user muốn tạo task thì thêm action create_task."""

    result = await llm.chat(system, [{"role": "user", "content": message}])
    return {
        "input": message,
        "raw_result": result,
        "has_messages": "messages" in result,
        "has_actions": "actions" in result,
        "actions_count": len(result.get("actions", [])),
    }


# ─── Health ───

@router.get("/actuator/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="UP", service="sonic-hub-companion", version="0.1.0"
    )
