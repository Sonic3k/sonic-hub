import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
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
        user_message: str, assistant_id=None, metadata: dict = None
    ) -> dict:
        # 1. Resolve assistant (explicit or default active)
        if assistant_id:
            assistant = await self.memory.get_assistant_by_id(db, assistant_id)
        else:
            assistant = await self.memory.get_active_assistant(db)

        if not assistant:
            return {
                "reply": "Chưa có assistant nào được tạo. Chạy seed trước nhé.",
                "typing_delay_ms": 0,
                "split": ["Chưa có assistant nào được tạo."],
                "conversation_id": "",
                "assistant_id": "",
                "assistant_nickname": "",
            }

        # 2. Channel & conversation
        channel = await self.memory.get_or_create_channel(db, channel_type, external_id)
        conversation = await self.memory.get_or_create_active_conversation(
            db, assistant.id, channel.id
        )

        # 3. Save user message
        user_msg = await self.memory.save_message(
            db, conversation.id, "user", user_message, channel_type, metadata
        )

        # 4. Load context (scoped by assistant)
        history = await self.memory.get_recent_messages(db, conversation.id, limit=20)
        profiles = await self.memory.get_user_profile(db, assistant.id)
        personalities = await self.memory.get_active_personality(db, assistant.id)

        # 5. Search relevant episodes
        keywords = self._extract_keywords(user_message)
        relevant_episodes = await self.memory.search_episodes_by_keywords(
            db, assistant.id, keywords
        )
        if not relevant_episodes:
            relevant_episodes = await self.memory.get_recent_episodes(db, assistant.id, limit=5)

        # 6. Build prompt (inject assistant identity)
        personality_text = self.memory.format_personality_for_prompt(personalities)
        system_prompt = self.llm.build_system_prompt(
            assistant_name=assistant.nickname,
            assistant_full_name=assistant.name,
            assistant_dob=str(assistant.date_of_birth) if assistant.date_of_birth else None,
            assistant_bio=assistant.bio,
            personality_text=personality_text,
            profile_text=self.memory.format_profile_for_prompt(profiles),
            episodes_text=self.memory.format_episodes_for_prompt(relevant_episodes),
        )

        history_without_current = history[:-1] if history else []
        messages = self.llm.build_messages(history_without_current, user_message)

        # 7. Call Claude
        reply = await self.llm.chat(system_prompt, messages)

        # 8. Save assistant reply
        await self.memory.save_message(
            db, conversation.id, "assistant", reply, channel_type
        )

        await db.commit()

        # 9. Background: extract memory
        asyncio.create_task(
            self._extract_and_save_memory(
                assistant.id, user_message, reply, conversation.id, user_msg.id
            )
        )

        # 10. Response style
        typing_delay = self.llm.calculate_typing_delay(reply)
        split = self.llm.split_message(reply)

        return {
            "reply": reply,
            "typing_delay_ms": typing_delay,
            "split": split,
            "conversation_id": str(conversation.id),
            "assistant_id": str(assistant.id),
            "assistant_nickname": assistant.nickname,
        }

    async def _extract_and_save_memory(
        self, assistant_id, user_message: str, reply: str,
        conversation_id, source_message_id
    ):
        try:
            extracted = await self.llm.extract_memory(user_message, reply)
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
                            source_message_id=source_message_id,
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

                personality_update = extracted.get("personality_update")
                if personality_update and personality_update.get("instruction"):
                    await self.memory.upsert_personality(
                        db, assistant_id,
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
