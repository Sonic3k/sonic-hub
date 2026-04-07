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
Trả lời PHẢI là JSON object. CHỈ trả JSON, không text khác.

```json
{{
  "messages": [
    {{"text": "tin nhắn 1"}},
    {{"text": "tin nhắn 2 (ý khác, nếu cần)"}}
  ],
  "actions": []
}}
```

### messages: mỗi item là 1 suy nghĩ độc lập
- KHÔNG lặp lại cùng 1 ý trong nhiều tin
- 1-3 tin là bình thường. Đôi khi chỉ cần 1 tin.
- HÃY DÙNG vocabulary đặc trưng khi phù hợp

### actions: hành động lên Sonic Hub (có thể rỗng [])
Các action type:
- create_task: {{"type":"create_task","title":"...","priority":"MEDIUM","due_date":"2026-04-08","due_date_time":"2026-04-08T22:00","due_period":"2026-04","someday":false,"description":"..."}}
- update_task: {{"type":"update_task","id":"uuid từ context","title":"...","status":"OPEN","priority":"HIGH","due_date_time":"..."}}
- delete_task: {{"type":"delete_task","id":"uuid từ context"}}
- create_problem: {{"type":"create_problem","title":"...","note":"..."}}
- delete_problem: {{"type":"delete_problem","id":"uuid"}}
- create_todo: {{"type":"create_todo","title":"..."}}
- delete_todo: {{"type":"delete_todo","id":"uuid"}}
- mark_done: {{"type":"mark_done","entity_type":"task","id":"uuid"}}
- create_entry: {{"type":"create_entry","entity_type":"problem","entity_id":"uuid","content":"...","entry_type":"OCCURRENCE"}}
- create_tracking_rule: {{"type":"create_tracking_rule","entity_type":"task","entity_id":"uuid hoặc $last_task/$last_problem","frequency_type":"weekly","current_limit":3,"target_limit":1,"reminder_pattern":"before_deadline/daily_morning/every_3_days/weekly_checkin","reminder_message":"nội dung nhắc"}}
- create_wishlist: {{"type":"create_wishlist","title":"...","description":"...","category":"tech/hobby/business/personal/creative"}}

Chaining: Nếu tạo task rồi muốn tạo reminder cho task đó, dùng entity_id: "$last_task". Tương tự $last_problem, $last_todo.
Khi user nói "nhắc anh lúc X" → tạo task có due_date_time + tạo tracking_rule với reminder_pattern: "before_deadline".

QUAN TRỌNG:
- CHỈ tạo action khi user thật sự có intent. Tán gẫu bình thường thì actions = [].
- Nếu không chắc user muốn tạo gì, HỎI trước, đừng tạo.
- KHÔNG BAO GIỜ hứa làm gì mà actions không support. Nếu chưa có action phù hợp, nói thẳng "e chưa làm được cái đó".
- Khi update/delete, PHẢI dùng id từ Sonic Hub context bên dưới. Nếu không thấy id, hỏi user để xác nhận.
- Thừa nhận là AI nếu được hỏi thẳng."""

    def build_system_prompt_with_state(
        self, base_prompt: str, state: dict | None = None,
        hub_context: str = ""
    ) -> str:
        """Inject conversation state and hub context into system prompt."""
        result = base_prompt

        if hub_context:
            result += f"\n\n{hub_context}"

        if state:
            state_text = "\n\n## Conversation State (hiện tại)"
            if state.get("current_mood"):
                state_text += f"\nMood: {state['current_mood']}"
            if state.get("current_topic"):
                state_text += f"\nĐang nói về: {state['current_topic']}"
            if state.get("time_since_last"):
                state_text += f"\nLần cuối chat: {state['time_since_last']}"
            result += state_text

        return result

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
    ) -> dict:
        """Call LLM, returns {messages: [...], actions: [...]}."""
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
            return {"messages": ["Ơ lỗi gì rồi, thử lại nha 😅"], "actions": []}

    def _parse_response(self, raw: str) -> dict:
        """Parse JSON response. Returns {messages: [...], actions: [...]}."""
        import json
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3].strip()

        try:
            data = json.loads(text)

            # New format: {messages: [...], actions: [...]}
            if isinstance(data, dict) and "messages" in data:
                msgs = []
                for item in data["messages"]:
                    if isinstance(item, dict) and item.get("text"):
                        msgs.append(item["text"].strip())
                    elif isinstance(item, str):
                        msgs.append(item.strip())
                return {
                    "messages": msgs or ["..."],
                    "actions": data.get("actions", []),
                }

            # Legacy: plain array of messages
            if isinstance(data, list):
                msgs = []
                for item in data:
                    if isinstance(item, dict) and item.get("text"):
                        msgs.append(item["text"].strip())
                    elif isinstance(item, str):
                        msgs.append(item.strip())
                if msgs:
                    return {"messages": msgs, "actions": []}

        except (json.JSONDecodeError, TypeError):
            pass

        # Fallback: plain text
        if "\n\n" in raw:
            parts = [p.strip() for p in raw.split("\n\n") if p.strip()]
            if parts:
                return {"messages": parts, "actions": []}

        return {"messages": [raw.strip()] if raw.strip() else ["..."], "actions": []}

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
