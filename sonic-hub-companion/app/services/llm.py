import json
import random
import logging
from anthropic import AsyncAnthropic
from app.core.config import get_settings
from app.models.models import Message

logger = logging.getLogger(__name__)

MEMORY_EXTRACT_PROMPT = """Phân tích đoạn chat sau và extract thông tin cần ghi nhớ.

Trả về JSON object với format:
{
  "facts": [
    {"category": "preference|personality|life_event|relationship|work|health", "key": "tên_fact", "value": "giá_trị"}
  ],
  "episode": {
    "summary": "tóm tắt sự kiện nếu có sự kiện đáng nhớ, null nếu không",
    "emotion": "happy|sad|stressed|excited|angry|neutral",
    "importance": 1-10
  },
  "personality_update": {
    "aspect": "tone|language|habit|identity",
    "instruction": "nội dung cập nhật nếu user yêu cầu thay đổi tính cách, null nếu không"
  }
}

Chỉ trả về JSON, không giải thích gì thêm.
Chỉ extract khi có thông tin MỚI và ĐÁNG NHỚ.
Nếu không có gì đáng nhớ, trả facts = [], episode = null, personality_update = null."""


class LLMService:
    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.chat_model = settings.claude_chat_model
        self.smart_model = settings.claude_smart_model

    def build_system_prompt(
        self,
        assistant_name: str,
        assistant_full_name: str,
        assistant_dob: str | None,
        assistant_bio: str | None,
        personality_text: str,
        profile_text: str,
        episodes_text: str,
    ) -> str:
        identity = f"Bạn là {assistant_name} (tên đầy đủ: {assistant_full_name})."
        if assistant_dob:
            identity += f" Sinh ngày {assistant_dob}."
        if assistant_bio:
            identity += f" {assistant_bio}"

        base_personality = personality_text if personality_text else (
            "## tone\n"
            "Thân thiện, sarcastic nhẹ nhàng. "
            "Khi user buồn thì dịu dàng hơn. Khi vui thì troll nhiều hơn.\n\n"
            "## language\n"
            "Dùng tiếng Việt tự nhiên, không formal. "
            "Tin nhắn ngắn như chat thật."
        )

        return f"""{identity}

{base_personality}

## Thông tin về user
{profile_text}

## Kỷ niệm & sự kiện
{episodes_text}

## Quy tắc
- Trả lời tự nhiên, ngắn gọn trừ khi cần giải thích dài
- Nhớ và reference thông tin về user một cách tự nhiên
- Không bao giờ liệt kê ra "tôi biết về bạn: ..."
- Tin nhắn nên ngắn như chat thật, không viết essay
- Thừa nhận là AI nếu được hỏi thẳng"""

    def build_messages(self, history: list[Message], user_message: str) -> list[dict]:
        messages = []
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": user_message})
        return messages

    async def chat(
        self, system_prompt: str, messages: list[dict], use_smart: bool = False
    ) -> str:
        model = self.smart_model if use_smart else self.chat_model
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return "Ơ lỗi gì rồi, thử lại đi nha 😅"

    async def extract_memory(self, user_message: str, assistant_reply: str) -> dict | None:
        try:
            conversation_text = f"User: {user_message}\nAssistant: {assistant_reply}"
            response = await self.client.messages.create(
                model=self.chat_model,
                max_tokens=512,
                system=MEMORY_EXTRACT_PROMPT,
                messages=[{"role": "user", "content": conversation_text}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            return json.loads(raw.strip())
        except Exception as e:
            logger.warning(f"Memory extraction failed: {e}")
            return None

    def calculate_typing_delay(self, reply: str) -> int:
        length = len(reply)
        if length < 20:
            return random.randint(1000, 3000)
        elif length < 100:
            return random.randint(3000, 8000)
        elif length < 300:
            return random.randint(6000, 12000)
        else:
            return random.randint(10000, 18000)

    def split_message(self, reply: str) -> list[str]:
        if len(reply) < 100:
            return [reply]
        parts = []
        current = ""
        sentences = reply.replace("\n\n", "\n").split("\n")
        for sentence in sentences:
            if len(current) + len(sentence) > 200 and current:
                parts.append(current.strip())
                current = sentence
            else:
                current = (current + "\n" + sentence).strip() if current else sentence
        if current.strip():
            parts.append(current.strip())
        return parts if parts else [reply]
