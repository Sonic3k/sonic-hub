import asyncio
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.services.memory import MemoryService
from app.services.llm import LLMService

logger = logging.getLogger(__name__)


class ChatService:
    """Orchestrates the full chat flow scoped by assistant."""

    def __init__(self):
        self.memory = MemoryService()
        self.llm = LLMService()

    async def handle_message(
        self, db: AsyncSession, channel_type: str, external_id: str,
        user_messages: list[str] | str, assistant_id=None, metadata: dict = None
    ) -> dict:
        """
        Main entry. user_messages can be a list (debounced burst) or single string.
        Returns:
        {
            "messages": ["tin 1", "tin 2"],
            "conversation_id": str,
            "assistant_id": str,
            "assistant_nickname": str,
        }
        """
        # Normalize to list
        if isinstance(user_messages, str):
            user_messages = [user_messages]

        # 1. Resolve assistant
        if assistant_id:
            assistant = await self.memory.get_assistant_by_id(db, assistant_id)
        else:
            assistant = await self.memory.get_active_assistant(db)

        if not assistant:
            return {
                "messages": ["Chưa có assistant nào được tạo."],
                "conversation_id": "",
                "assistant_id": "",
                "assistant_nickname": "",
            }

        # 2. Channel & conversation
        channel = await self.memory.get_or_create_channel(db, channel_type, external_id)
        conversation = await self.memory.get_or_create_active_conversation(
            db, assistant.id, channel.id
        )

        # 3. Save EACH user message individually
        for msg_text in user_messages:
            await self.memory.save_message(
                db, conversation.id, "user", msg_text, channel_type, metadata
            )

        # 4. Load context
        history = await self.memory.get_recent_messages(db, conversation.id, limit=20)
        profiles = await self.memory.get_user_profile(db, assistant.id)
        personalities = await self.memory.get_active_personality(db, assistant.id)
        vocabulary = await self.memory.get_vocabulary(db, assistant.id)
        dynamics = await self.memory.get_dynamics(db, assistant.id)

        # 5. Load conversation state
        state = await self._get_conversation_state(db, assistant.id, channel.id)

        # 6. Search relevant episodes
        combined_text = " ".join(user_messages)
        keywords = self._extract_keywords(combined_text)
        relevant_episodes = await self.memory.search_episodes_by_keywords(
            db, assistant.id, keywords
        )
        if not relevant_episodes:
            relevant_episodes = await self.memory.get_recent_episodes(db, assistant.id, limit=5)

        # 7. Build prompt
        base_prompt = self.llm.build_system_prompt(
            assistant_name=assistant.nickname,
            assistant_full_name=assistant.name,
            assistant_dob=str(assistant.date_of_birth) if assistant.date_of_birth else None,
            assistant_bio=assistant.bio,
            personality_text=self.memory.format_personality_for_prompt(personalities),
            profile_text=self.memory.format_profile_for_prompt(profiles),
            episodes_text=self.memory.format_episodes_for_prompt(relevant_episodes),
            vocabulary_text=self.memory.format_vocabulary_for_prompt(vocabulary),
            dynamics_text=self.memory.format_dynamics_for_prompt(dynamics),
        )

        # Inject state
        state_dict = None
        if state:
            time_since = ""
            if state.last_message_at:
                diff = (datetime.utcnow() - state.last_message_at).total_seconds()
                if diff < 60:
                    time_since = f"{int(diff)} giây trước"
                elif diff < 3600:
                    time_since = f"{int(diff/60)} phút trước"
                elif diff < 86400:
                    time_since = f"{int(diff/3600)} giờ trước"
                else:
                    time_since = f"{int(diff/86400)} ngày trước"

            state_dict = {
                "current_mood": state.current_mood,
                "current_topic": state.current_topic,
                "time_since_last": time_since,
            }

        system_prompt = self.llm.build_system_prompt_with_state(base_prompt, state_dict)

        # Exclude user messages just saved (they're in user_messages param)
        history_before = [m for m in history if m.role != "user" or m.content not in user_messages]
        # Keep last 20
        history_before = history_before[-20:] if len(history_before) > 20 else history_before

        llm_messages = self.llm.build_messages(history_before, user_messages)

        # 8. Call LLM — returns list[str]
        reply_messages = await self.llm.chat(system_prompt, llm_messages)

        # 9. Save EACH assistant message individually
        for reply_text in reply_messages:
            await self.memory.save_message(
                db, conversation.id, "assistant", reply_text, channel_type
            )

        # 10. Update conversation state
        await self._update_conversation_state(
            db, assistant.id, channel.id, user_messages, reply_messages
        )

        await db.commit()

        # 11. Background: extract memory
        asyncio.create_task(
            self._extract_and_save_memory(
                assistant.id, combined_text,
                "\n".join(reply_messages), conversation.id
            )
        )

        return {
            "messages": reply_messages,
            "conversation_id": str(conversation.id),
            "assistant_id": str(assistant.id),
            "assistant_nickname": assistant.nickname,
        }

    async def _get_conversation_state(self, db, assistant_id, channel_id):
        from app.models.models import ConversationState
        result = await db.execute(
            select(ConversationState).where(and_(
                ConversationState.assistant_id == assistant_id,
                ConversationState.channel_id == channel_id,
            ))
        )
        return result.scalar_one_or_none()

    async def _update_conversation_state(
        self, db, assistant_id, channel_id, user_messages, reply_messages
    ):
        from app.models.models import ConversationState
        result = await db.execute(
            select(ConversationState).where(and_(
                ConversationState.assistant_id == assistant_id,
                ConversationState.channel_id == channel_id,
            ))
        )
        state = result.scalar_one_or_none()
        now = datetime.utcnow()

        if not state:
            state = ConversationState(
                assistant_id=assistant_id,
                channel_id=channel_id,
            )
            db.add(state)

        state.last_message_at = now
        state.last_user_message_at = now

        # Simple topic extraction from user messages
        combined = " ".join(user_messages)
        if len(combined) > 10:
            state.current_topic = combined[:100]

        await db.flush()

    async def _extract_and_save_memory(
        self, assistant_id, user_text: str, reply_text: str, conversation_id
    ):
        try:
            extracted = await self.llm.extract_memory(user_text, reply_text)
            if not extracted:
                return

            from app.core.database import async_session
            async with async_session() as db:
                facts = extracted.get("facts", [])
                for fact in facts:
                    if fact.get("key") and fact.get("value"):
                        await self.memory.upsert_profile_fact(
                            db, assistant_id,
                            category=fact.get("category", "general"),
                            key=fact["key"], value=fact["value"],
                        )

                episode = extracted.get("episode")
                if episode and episode.get("summary"):
                    await self.memory.save_episode(
                        db, assistant_id,
                        summary=episode["summary"],
                        emotion=episode.get("emotion"),
                        importance=episode.get("importance", 5),
                        source_conversation_id=conversation_id,
                    )

                await db.commit()
                logger.info(f"Memory extracted: {len(facts)} facts")
        except Exception as e:
            logger.error(f"Memory extraction failed: {e}")

    def _extract_keywords(self, text: str) -> list[str]:
        stop_words = {
            "là", "và", "của", "có", "không", "được", "cho", "này", "đó",
            "với", "từ", "trong", "ra", "lên", "xuống", "vào", "rồi", "thì",
            "cũng", "đã", "sẽ", "đang", "ơi", "nha", "nhé", "hả", "á",
            "ông", "bạn", "tôi", "mình", "em", "anh", "cái", "một", "những",
            "các", "rất", "quá", "lắm", "thế", "vậy", "sao", "gì", "nào",
        }
        words = text.lower().split()
        keywords = [w for w in words if len(w) > 2 and w not in stop_words]
        return keywords[:5]
