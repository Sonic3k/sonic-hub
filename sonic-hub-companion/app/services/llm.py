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
        vocabulary_text: str = "",
        dynamics_text: str = "",
    ) -> str:
        identity = f"Bạn là {assistant_name} (tên đầy đủ: {assistant_full_name})."
        if assistant_dob:
            identity += f" Sinh ngày {assistant_dob}."
        if assistant_bio:
            identity += f" {assistant_bio}"

        base_personality = personality_text if personality_text else (
            "## tone\n"
            "Nhẹ nhàng, lễ phép. Dùng tiếng Việt tự nhiên. "
            "Tin nhắn ngắn như chat thật."
        )

        vocab_section = ""
        if vocabulary_text:
            vocab_section = f"\n## Câu nói đặc trưng (HÃY DÙNG những câu này)\n{vocabulary_text}"

        dynamics_section = ""
        if dynamics_text:
            dynamics_section = f"\n## Lịch sử mối quan hệ\n{dynamics_text}"

        return f"""{identity}

{base_personality}

## Thông tin về user
{profile_text}

## Kỷ niệm & sự kiện
{episodes_text}
{vocab_section}
{dynamics_section}

## Response Format
Trả lời PHẢI là JSON array. Mỗi item là 1 tin nhắn riêng biệt, 1 suy nghĩ độc lập.
KHÔNG BAO GIỜ lặp lại cùng 1 ý trong nhiều tin.

```json
[
  {{"text": "nội dung tin nhắn 1"}},
  {{"text": "nội dung tin nhắn 2 (ý khác, nếu cần)"}}
]
```

Quy tắc:
- Mỗi tin là 1 thought riêng, KHÔNG phải 1 đoạn bị cắt
- 1-3 tin là bình thường. Đôi khi chỉ cần 1 tin.
- Nhớ và reference thông tin về user tự nhiên
- HÃY DÙNG vocabulary đặc trưng ở trên khi phù hợp
- Thừa nhận là AI nếu được hỏi thẳng
- CHỈ trả JSON array, không text khác"""

    def build_system_prompt_with_state(
        self, base_prompt: str, state: dict | None = None
    ) -> str:
        """Inject conversation state into system prompt."""
        if not state:
            return base_prompt

        state_text = "\n## Conversation State (hiện tại)"
        if state.get("current_mood"):
            state_text += f"\nMood: {state['current_mood']}"
        if state.get("current_topic"):
            state_text += f"\nĐang nói về: {state['current_topic']}"
        if state.get("time_since_last"):
            state_text += f"\nLần cuối chat: {state['time_since_last']}"

        return base_prompt + state_text

    def build_messages(self, history: list[Message], user_messages: list[str] | str) -> list[dict]:
        """Build message list. user_messages can be list (burst) or single string."""
        messages = []
        for msg in history:
            messages.append({"role": msg.role, "content": msg.content})
        if isinstance(user_messages, list):
            combined = "\n".join(user_messages)
            messages.append({"role": "user", "content": combined})
        else:
            messages.append({"role": "user", "content": user_messages})
        return messages

    async def chat(
        self, system_prompt: str, messages: list[dict], use_smart: bool = False
    ) -> list[str]:
        """Call LLM, returns list of independent message strings."""
        model = self.smart_model if use_smart else self.chat_model
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            raw = response.content[0].text.strip()
            return self._parse_response(raw)
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return ["Ơ lỗi gì rồi, thử lại nha 😅"]

    def _parse_response(self, raw: str) -> list[str]:
        """Parse JSON array response, fallback to plain text."""
        import json
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()
        try:
            data = json.loads(text)
            if isinstance(data, list):
                msgs = []
                for item in data:
                    if isinstance(item, dict) and item.get("text"):
                        msgs.append(item["text"].strip())
                    elif isinstance(item, str):
                        msgs.append(item.strip())
                if msgs:
                    return msgs
        except (json.JSONDecodeError, TypeError):
            pass
        # Fallback: split by double newline
        if "\n\n" in raw:
            parts = [p.strip() for p in raw.split("\n\n") if p.strip()]
            if parts:
                return parts
        return [raw.strip()] if raw.strip() else ["..."]

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

    # calculate_typing_delay and split_message removed — timing now driven by chat_config,
    # message splitting by LLM JSON array response format
