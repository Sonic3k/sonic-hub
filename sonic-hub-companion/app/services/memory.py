import logging
from datetime import datetime, timedelta
from sqlalchemy import select, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import (
    Assistant, Channel, Conversation, Message, UserProfile, Episode, Personality
)

logger = logging.getLogger(__name__)


class MemoryService:
    """Manages all memory operations scoped by assistant_id."""

    # ─── Assistant ───

    async def get_active_assistant(self, db: AsyncSession) -> Assistant | None:
        result = await db.execute(
            select(Assistant).where(Assistant.active == True).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_assistant_by_id(self, db: AsyncSession, assistant_id) -> Assistant | None:
        result = await db.execute(
            select(Assistant).where(Assistant.id == assistant_id)
        )
        return result.scalar_one_or_none()

    async def get_all_assistants(self, db: AsyncSession) -> list[Assistant]:
        result = await db.execute(select(Assistant).order_by(Assistant.name))
        return list(result.scalars().all())

    # ─── Channel & Conversation ───

    async def get_or_create_channel(
        self, db: AsyncSession, channel_type: str, external_id: str
    ) -> Channel:
        result = await db.execute(
            select(Channel).where(
                and_(Channel.type == channel_type, Channel.external_id == external_id)
            )
        )
        channel = result.scalar_one_or_none()
        if not channel:
            channel = Channel(type=channel_type, external_id=external_id)
            db.add(channel)
            await db.flush()
        return channel

    async def get_or_create_active_conversation(
        self, db: AsyncSession, assistant_id, channel_id, idle_minutes: int = 120
    ) -> Conversation:
        result = await db.execute(
            select(Conversation)
            .where(and_(
                Conversation.assistant_id == assistant_id,
                Conversation.channel_id == channel_id,
                Conversation.is_active == True,
            ))
            .order_by(desc(Conversation.started_at))
            .limit(1)
        )
        conv = result.scalar_one_or_none()

        if conv:
            last_msg = await db.execute(
                select(Message)
                .where(Message.conversation_id == conv.id)
                .order_by(desc(Message.timestamp))
                .limit(1)
            )
            last = last_msg.scalar_one_or_none()
            if last and (datetime.utcnow() - last.timestamp) > timedelta(minutes=idle_minutes):
                conv.is_active = False
                conv.ended_at = last.timestamp
                conv = None

        if not conv:
            conv = Conversation(assistant_id=assistant_id, channel_id=channel_id)
            db.add(conv)
            await db.flush()

        return conv

    # ─── Messages ───

    async def save_message(
        self, db: AsyncSession, conversation_id, role: str, content: str,
        channel_type: str, metadata: dict = None
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role, content=content,
            channel_type=channel_type, metadata_=metadata,
        )
        db.add(msg)
        await db.flush()
        return msg

    async def get_recent_messages(
        self, db: AsyncSession, conversation_id, limit: int = 20
    ) -> list[Message]:
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(desc(Message.timestamp))
            .limit(limit)
        )
        messages = list(result.scalars().all())
        messages.reverse()
        return messages

    # ─── User Profile (scoped by assistant) ───

    async def get_user_profile(self, db: AsyncSession, assistant_id) -> list[UserProfile]:
        result = await db.execute(
            select(UserProfile)
            .where(UserProfile.assistant_id == assistant_id)
            .order_by(UserProfile.category, UserProfile.key)
        )
        return list(result.scalars().all())

    async def upsert_profile_fact(
        self, db: AsyncSession, assistant_id, category: str, key: str,
        value: str, confidence: float = 1.0, source_message_id=None
    ):
        result = await db.execute(
            select(UserProfile).where(and_(
                UserProfile.assistant_id == assistant_id,
                UserProfile.key == key,
            ))
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.value = value
            existing.confidence = confidence
            existing.updated_at = datetime.utcnow()
            if source_message_id:
                existing.source_message_id = source_message_id
        else:
            fact = UserProfile(
                assistant_id=assistant_id,
                category=category, key=key, value=value,
                confidence=confidence, source_message_id=source_message_id,
            )
            db.add(fact)
        await db.flush()

    def format_profile_for_prompt(self, profiles: list[UserProfile]) -> str:
        if not profiles:
            return "Chưa biết gì về user."
        categories = {}
        for p in profiles:
            categories.setdefault(p.category, []).append(f"- {p.key}: {p.value}")
        parts = []
        for cat, items in categories.items():
            parts.append(f"[{cat}]\n" + "\n".join(items))
        return "\n".join(parts)

    # ─── Episodes (scoped by assistant) ───

    async def get_recent_episodes(
        self, db: AsyncSession, assistant_id, limit: int = 10
    ) -> list[Episode]:
        result = await db.execute(
            select(Episode)
            .where(Episode.assistant_id == assistant_id)
            .order_by(desc(Episode.occurred_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def search_episodes_by_keywords(
        self, db: AsyncSession, assistant_id, keywords: list[str], limit: int = 5
    ) -> list[Episode]:
        if not keywords:
            return []
        conditions = [Episode.summary.ilike(f"%{kw}%") for kw in keywords]
        result = await db.execute(
            select(Episode)
            .where(and_(Episode.assistant_id == assistant_id, or_(*conditions)))
            .order_by(desc(Episode.importance), desc(Episode.occurred_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def save_episode(
        self, db: AsyncSession, assistant_id, summary: str, emotion: str = None,
        importance: int = 5, source_conversation_id=None, occurred_at=None
    ) -> Episode:
        ep = Episode(
            assistant_id=assistant_id,
            summary=summary, emotion=emotion, importance=importance,
            source_conversation_id=source_conversation_id,
        )
        if occurred_at:
            ep.occurred_at = occurred_at
        db.add(ep)
        await db.flush()
        return ep

    def format_episodes_for_prompt(self, episodes: list[Episode]) -> str:
        if not episodes:
            return "Chưa có kỷ niệm nào."
        lines = []
        for ep in episodes:
            date_str = ep.occurred_at.strftime("%d/%m/%Y")
            emotion_str = f" ({ep.emotion})" if ep.emotion else ""
            lines.append(f"- [{date_str}]{emotion_str} {ep.summary}")
        return "\n".join(lines)

    # ─── Personality (scoped by assistant) ───

    async def get_active_personality(self, db: AsyncSession, assistant_id) -> list[Personality]:
        result = await db.execute(
            select(Personality)
            .where(and_(Personality.assistant_id == assistant_id, Personality.active == True))
            .order_by(Personality.aspect)
        )
        return list(result.scalars().all())

    async def upsert_personality(
        self, db: AsyncSession, assistant_id, aspect: str, instruction: str,
        examples: dict = None
    ):
        result = await db.execute(
            select(Personality).where(and_(
                Personality.assistant_id == assistant_id,
                Personality.aspect == aspect,
            ))
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.instruction = instruction
            existing.examples = examples
            existing.version += 1
            existing.updated_at = datetime.utcnow()
        else:
            p = Personality(
                assistant_id=assistant_id,
                aspect=aspect, instruction=instruction, examples=examples,
            )
            db.add(p)
        await db.flush()

    def format_personality_for_prompt(self, personalities: list[Personality]) -> str:
        if not personalities:
            return ""
        parts = []
        for p in personalities:
            parts.append(f"## {p.aspect}\n{p.instruction}")
            if p.examples:
                if p.examples.get("good"):
                    parts.append("Ví dụ ĐÚNG: " + " | ".join(p.examples["good"]))
                if p.examples.get("bad"):
                    parts.append("Ví dụ SAI: " + " | ".join(p.examples["bad"]))
        return "\n\n".join(parts)

    # ─── Vocabulary ───

    async def get_vocabulary(self, db: AsyncSession, assistant_id) -> list:
        from app.models.models import Vocabulary
        result = await db.execute(
            select(Vocabulary)
            .where(Vocabulary.assistant_id == assistant_id)
            .order_by(Vocabulary.context, Vocabulary.phrase)
        )
        return list(result.scalars().all())

    async def save_vocabulary(
        self, db: AsyncSession, assistant_id, phrase: str,
        context: str = None, frequency: str = "common"
    ):
        from app.models.models import Vocabulary
        v = Vocabulary(
            assistant_id=assistant_id, phrase=phrase,
            context=context, frequency=frequency,
        )
        db.add(v)
        await db.flush()
        return v

    def format_vocabulary_for_prompt(self, vocab: list) -> str:
        if not vocab:
            return ""
        by_context = {}
        for v in vocab:
            ctx = v.context or "general"
            by_context.setdefault(ctx, []).append(v.phrase)
        parts = []
        for ctx, phrases in by_context.items():
            parts.append(f"[{ctx}] " + " | ".join(phrases))
        return "\n".join(parts)

    # ─── Dynamics ───

    async def get_dynamics(self, db: AsyncSession, assistant_id) -> list:
        from app.models.models import Dynamics
        result = await db.execute(
            select(Dynamics)
            .where(Dynamics.assistant_id == assistant_id)
            .order_by(Dynamics.period)
        )
        return list(result.scalars().all())

    async def save_dynamics(
        self, db: AsyncSession, assistant_id, period: str,
        description: str, sentiment: str = None
    ):
        from app.models.models import Dynamics
        d = Dynamics(
            assistant_id=assistant_id, period=period,
            description=description, sentiment=sentiment,
        )
        db.add(d)
        await db.flush()
        return d

    def format_dynamics_for_prompt(self, dynamics: list) -> str:
        if not dynamics:
            return ""
        parts = []
        for d in dynamics:
            s = f" ({d.sentiment})" if d.sentiment else ""
            parts.append(f"- [{d.period}]{s}: {d.description}")
        return "\n".join(parts)
