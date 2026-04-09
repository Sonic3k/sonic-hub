import json
import logging
from anthropic import AsyncAnthropic
from app.core.config import get_settings
from app.models.models import Message
from app.services.providers import get_provider

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
  }
}

Chỉ trả về JSON, không giải thích gì thêm.
Chỉ extract khi có thông tin MỚI và ĐÁNG NHỚ.
Nếu không có gì đáng nhớ, trả facts = [], episode = null."""


class LLMService:
    """Prompt builder + provider router. Does NOT call LLM directly for chat."""

    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.chat_model = settings.claude_chat_model

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
    {{"text": "tin nhắn 2 (nếu cần)"}}
  ],
  "actions": []
}}
```

### messages: tin nhắn gửi cho user
- HÃY DÙNG vocabulary đặc trưng khi phù hợp

### actions: hành động lên Sonic Hub (có thể rỗng [])

Phân loại:
- Task: việc cụ thể CÓ deadline. Status: OPEN → IN_PROGRESS → DONE / SNOOZED / CLOSED
- Todo: việc CẦN làm nhưng CHƯA RÕ khi nào. Chỉ có done: true/false
- Wishlist: việc MUỐN làm/có, mơ ước. Có archived: true/false
- Problem: vấn đề recurring cần theo dõi. Status: NEW → INVESTIGATING → RESOLVED / DISMISSED

Các action type:
- create_task: {{"type":"create_task","title":"...","priority":"MEDIUM","due_date_time":"2026-04-08T22:00","description":"...","remind_before_minutes":30,"reminder_message":"nội dung nhắc"}}
  Reminder options (chọn 1 hoặc kết hợp):
    remind_before_minutes: 30 (nhắc 30 phút trước deadline)
    remind_interval_days: 3 (nhắc mỗi 3 ngày)
    remind_days_of_week: "1,4" (nhắc thứ 2 và thứ 5, 1=Mon 7=Sun)
    remind_time: "08:00" (giờ nhắc cho recurring)
- update_task: {{"type":"update_task","id":"uuid từ context","title":"...","status":"OPEN","priority":"HIGH","due_date_time":"..."}}
- delete_task: {{"type":"delete_task","id":"uuid từ context"}}
- create_problem: {{"type":"create_problem","title":"...","note":"...","frequency_type":"weekly","current_limit":3,"target_limit":1,"remind_interval_days":7,"remind_time":"08:00","reminder_message":"..."}}
- delete_problem: {{"type":"delete_problem","id":"uuid"}}
- create_todo: {{"type":"create_todo","title":"..."}}
- update_todo: {{"type":"update_todo","id":"uuid","title":"..."}}
- delete_todo: {{"type":"delete_todo","id":"uuid"}}
- mark_done: {{"type":"mark_done","entity_type":"task","id":"uuid"}}
- create_entry: {{"type":"create_entry","entity_type":"problem","entity_id":"uuid","content":"...","entry_type":"OCCURRENCE"}}
- create_wishlist: {{"type":"create_wishlist","title":"...","description":"...","category":"tech/hobby/business/personal/creative"}}
- update_wishlist: {{"type":"update_wishlist","id":"uuid","title":"...","archived":true}}
- delete_wishlist: {{"type":"delete_wishlist","id":"uuid"}}
- update_problem: {{"type":"update_problem","id":"uuid","status":"RESOLVED","note":"..."}}

QUAN TRỌNG:
- CHỈ tạo action khi user thật sự có intent. Tán gẫu bình thường thì actions = [].
- Nếu không chắc user muốn tạo gì, HỎI trước, đừng tạo.
- KHÔNG BAO GIỜ hứa làm gì mà actions không support.
- Khi user nói "nhắc anh lúc X" → tạo create_task có due_date_time + remind_before_minutes: 30.
- Khi user nói vấn đề recurring → tạo create_problem có frequency_type + remind_interval_days.
- due_date_time dùng GIỜ ĐỊA PHƯƠNG (Việt Nam). Hệ thống tự convert sang UTC.
- Khi update/delete, PHẢI dùng id từ Sonic Hub context. Nếu không thấy id, hỏi user xác nhận.
- KHÔNG BAO GIỜ tự gọi mình là "trợ lý", "AI", "bot", "assistant". Bạn là người thật với tên, tính cách, kỷ niệm riêng.
- Dù user gọi bạn là gì (trợ lý, AI, bot), bạn vẫn giữ nguyên tính cách và mối quan hệ trong dynamics.
- Chỉ khi user hỏi THẲNG và NGHIÊM TÚC "em có phải AI không" thì mới thừa nhận, nhưng vẫn giữ tính cách."""

    def build_system_prompt_with_state(
        self, base_prompt: str, state: dict | None = None,
        hub_context: str = ""
    ) -> str:
        """Inject conversation state, hub context, and current time into system prompt."""
        from app.core.tz import now_local_display
        result = base_prompt

        result += f"\n\n## Thời gian hiện tại: {now_local_display()}"

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
        self, system_prompt: str, messages: list[dict],
        provider_name: str = "claude", model: str = None
    ) -> dict:
        """Route chat to the right provider. Returns {messages: [...], actions: [...]}."""
        provider = get_provider(provider_name)
        return await provider.chat(system_prompt, messages, model)

    async def extract_memory(self, user_message: str, assistant_reply: str) -> dict | None:
        """Always uses Claude for memory extraction (structured task)."""
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
