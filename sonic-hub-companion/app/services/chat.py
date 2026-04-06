import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.memory import MemoryService
from app.services.llm import LLMService

logger = logging.getLogger(__name__)


class ChatService:
    """Orchestrates the full chat flow: memory → LLM → response → extract."""

    def __init__(self):
        self.memory = MemoryService()
        self.llm = LLMService()

    async def handle_message(
        self, db: AsyncSession, channel_type: str, external_id: str,
        user_message: str, metadata: dict = None
    ) -> dict:
        """
        Main entry point. Returns:
        {
            "reply": str,
            "typing_delay_ms": int,
            "split": list[str],
            "conversation_id": str,
        }
        """
        # 1. Get/create channel & conversation
        channel = await self.memory.get_or_create_channel(db, channel_type, external_id)
        conversation = await self.memory.get_or_create_active_conversation(db, channel.id)

        # 2. Save user message
        user_msg = await self.memory.save_message(
            db, conversation.id, "user", user_message, channel_type, metadata
        )

        # 3. Load context
        history = await self.memory.get_recent_messages(db, conversation.id, limit=20)
        profiles = await self.memory.get_user_profile(db)
        personalities = await self.memory.get_active_personality(db)

        # 4. Search relevant episodes
        keywords = self._extract_keywords(user_message)
        relevant_episodes = await self.memory.search_episodes_by_keywords(db, keywords)
        if not relevant_episodes:
            relevant_episodes = await self.memory.get_recent_episodes(db, limit=5)

        # 5. Build prompt
        personality_text = self.llm.build_system_prompt(
            self.memory.format_personality_for_prompt(personalities),
            self.memory.format_profile_for_prompt(profiles),
            self.memory.format_episodes_for_prompt(relevant_episodes),
        )

        # Exclude the just-saved user message from history (it's in the new message)
        history_without_current = history[:-1] if history else []
        messages = self.llm.build_messages(history_without_current, user_message)

        # 6. Call Claude
        reply = await self.llm.chat(personality_text, messages)

        # 7. Save assistant reply
        await self.memory.save_message(
            db, conversation.id, "assistant", reply, channel_type
        )

        await db.commit()

        # 8. Background: extract memory (fire-and-forget)
        asyncio.create_task(
            self._extract_and_save_memory(user_message, reply, conversation.id, user_msg.id)
        )

        # 9. Calculate response style
        typing_delay = self.llm.calculate_typing_delay(reply)
        split = self.llm.split_message(reply)

        return {
            "reply": reply,
            "typing_delay_ms": typing_delay,
            "split": split,
            "conversation_id": str(conversation.id),
        }

    async def _extract_and_save_memory(
        self, user_message: str, reply: str,
        conversation_id, source_message_id
    ):
        """Background task: extract facts & episodes from conversation."""
        try:
            extracted = await self.llm.extract_memory(user_message, reply)
            if not extracted:
                return

            from app.core.database import async_session
            async with async_session() as db:
                # Save facts
                facts = extracted.get("facts", [])
                for fact in facts:
                    if fact.get("key") and fact.get("value"):
                        await self.memory.upsert_profile_fact(
                            db,
                            category=fact.get("category", "general"),
                            key=fact["key"],
                            value=fact["value"],
                            source_message_id=source_message_id,
                        )

                # Save episode
                episode = extracted.get("episode")
                if episode and episode.get("summary"):
                    await self.memory.save_episode(
                        db,
                        summary=episode["summary"],
                        emotion=episode.get("emotion"),
                        importance=episode.get("importance", 5),
                        source_conversation_id=conversation_id,
                    )

                # Update personality if requested
                personality_update = extracted.get("personality_update")
                if personality_update and personality_update.get("instruction"):
                    await self.memory.upsert_personality(
                        db,
                        aspect=personality_update.get("aspect", "custom"),
                        instruction=personality_update["instruction"],
                    )

                await db.commit()
                logger.info(
                    f"Memory extracted: {len(facts)} facts, "
                    f"episode={'yes' if episode and episode.get('summary') else 'no'}"
                )

        except Exception as e:
            logger.error(f"Memory extraction background task failed: {e}")

    def _extract_keywords(self, text: str) -> list[str]:
        """Simple keyword extraction from user message."""
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
