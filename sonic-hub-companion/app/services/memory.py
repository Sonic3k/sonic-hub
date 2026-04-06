import json
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import (
    Channel, Conversation, Message, UserProfile, Episode, Personality
)

logger = logging.getLogger(__name__)


class MemoryService:
    """Manages all memory operations: profile, episodes, conversations."""

    # ─── Channel & Conversation Management ───

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
        self, db: AsyncSession, channel_id, idle_minutes: int = 120
    ) -> Conversation:
        """Get active conversation or create new one if idle > threshold."""
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.channel_id == channel_id,
                    Conversation.is_active == True,
                )
            )
            .order_by(desc(Conversation.started_at))
            .limit(1)
        )
        conv = result.scalar_one_or_none()

        if conv:
            # Check if conversation is stale
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
            conv = Conversation(channel_id=channel_id)
            db.add(conv)
            await db.flush()

        return conv

    # ─── Message History ───

    async def save_message(
        self, db: AsyncSession, conversation_id, role: str, content: str,
        channel_type: str, metadata: dict = None
    ) -> Message:
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            channel_type=channel_type,
            metadata_=metadata,
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
        messages.reverse()  # chronological order
        return messages

    # ─── User Profile ───

    async def get_user_profile(self, db: AsyncSession) -> list[UserProfile]:
        result = await db.execute(
            select(UserProfile).order_by(UserProfile.category, UserProfile.key)
        )
        return list(result.scalars().all())

    async def upsert_profile_fact(
        self, db: AsyncSession, category: str, key: str, value: str,
        confidence: float = 1.0, source_message_id=None
    ):
        result = await db.execute(
            select(UserProfile).where(UserProfile.key == key)
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

    # ─── Episodes ───

    async def get_recent_episodes(
        self, db: AsyncSession, limit: int = 10
    ) -> list[Episode]:
        result = await db.execute(
            select(Episode)
            .order_by(desc(Episode.occurred_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def search_episodes_by_keywords(
        self, db: AsyncSession, keywords: list[str], limit: int = 5
    ) -> list[Episode]:
        """Simple keyword search on episode summaries."""
        if not keywords:
            return []
        conditions = [Episode.summary.ilike(f"%{kw}%") for kw in keywords]
        from sqlalchemy import or_
        result = await db.execute(
            select(Episode)
            .where(or_(*conditions))
            .order_by(desc(Episode.importance), desc(Episode.occurred_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def save_episode(
        self, db: AsyncSession, summary: str, emotion: str = None,
        importance: int = 5, source_conversation_id=None
    ) -> Episode:
        ep = Episode(
            summary=summary, emotion=emotion, importance=importance,
            source_conversation_id=source_conversation_id,
        )
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

    # ─── Personality ───

    async def get_active_personality(self, db: AsyncSession) -> list[Personality]:
        result = await db.execute(
            select(Personality)
            .where(Personality.active == True)
            .order_by(Personality.aspect)
        )
        return list(result.scalars().all())

    async def upsert_personality(
        self, db: AsyncSession, aspect: str, instruction: str,
        examples: dict = None
    ):
        result = await db.execute(
            select(Personality).where(Personality.aspect == aspect)
        )
        existing = result.scalar_one_or_none()
        if existing:
            existing.instruction = instruction
            existing.examples = examples
            existing.version += 1
            existing.updated_at = datetime.utcnow()
        else:
            p = Personality(
                aspect=aspect, instruction=instruction, examples=examples
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
