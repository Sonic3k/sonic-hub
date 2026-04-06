"""
Import Yahoo Messenger chat history into companion DB.
Multi-pass extraction using Sonnet for deep analysis.
"""
import asyncio
import re
import sys
import json
import logging
from datetime import datetime
from anthropic import AsyncAnthropic
from app.core.database import init_db, async_session
from app.core.config import get_settings
from app.services.memory import MemoryService
from app.models.models import Assistant, Conversation, Message
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
memory = MemoryService()

# ─── Parser ───

def parse_ym_chat_from_text(raw: str) -> list[dict]:
    lines = raw.replace('\r\n', '\n').split('\n')
    return _parse_lines(lines)


def parse_ym_chat(filepath: str) -> list[dict]:
    try:
        with open(filepath, 'r', encoding='utf-16') as f:
            raw = f.read()
    except (UnicodeError, UnicodeDecodeError):
        with open(filepath, 'r', encoding='utf-8-sig') as f:
            raw = f.read()
    return parse_ym_chat_from_text(raw)


def _parse_lines(lines: list[str]) -> list[dict]:
    """Parse lines into structured conversations."""
    conversations = []
    current_date = None
    current_messages = []

    date_pattern = re.compile(r'^.?IM\s+(\w+ \d+, \d+ \d+:\d+:\d+ [AP]M)')
    msg_pattern = re.compile(r'^(\d+:\d+:\d+ [AP]M)\s+(hypersonic3k|Tommy Filan):\s*(.*)')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        date_match = date_pattern.match(line)
        if date_match:
            if current_messages and current_date:
                conversations.append({'date': current_date, 'messages': current_messages})
            try:
                current_date = datetime.strptime(date_match.group(1), '%b %d, %Y %I:%M:%S %p')
            except ValueError:
                current_date = None
            current_messages = []
            continue

        msg_match = msg_pattern.match(line)
        if msg_match and current_date:
            time_str = msg_match.group(1)
            sender = msg_match.group(2)
            content = re.sub(r'<[^>]+>', '', msg_match.group(3)).strip()
            if not content:
                continue
            try:
                msg_time = datetime.strptime(time_str, '%I:%M:%S %p')
                timestamp = current_date.replace(
                    hour=msg_time.hour, minute=msg_time.minute, second=msg_time.second
                )
            except ValueError:
                timestamp = current_date

            current_messages.append({
                'role': 'user' if sender == 'hypersonic3k' else 'assistant',
                'content': content,
                'timestamp': timestamp,
                'sender': sender,
            })

    if current_messages and current_date:
        conversations.append({'date': current_date, 'messages': current_messages})
    return conversations


# ─── Import to DB ───

async def import_conversations(conversations: list[dict], assistant_id, channel_id):
    total_msgs = 0
    async with async_session() as db:
        for conv_data in conversations:
            if not conv_data['messages']:
                continue
            conv = Conversation(
                assistant_id=assistant_id, channel_id=channel_id,
                started_at=conv_data['date'],
                ended_at=conv_data['messages'][-1]['timestamp'],
                is_active=False,
            )
            db.add(conv)
            await db.flush()
            for msg in conv_data['messages']:
                db.add(Message(
                    conversation_id=conv.id, role=msg['role'],
                    content=msg['content'], timestamp=msg['timestamp'],
                    channel_type='yahoo_messenger',
                ))
                total_msgs += 1
        await db.commit()
    return total_msgs


# ─── Multi-Pass Extraction ───

PASS1_FACTS_PROMPT = """Phân tích đoạn chat giữa Ngọc Anh (hypersonic3k) và Tommy Filan (Bùi Tố Lan).
Họ quen qua fan club Westlife, chat trên Yahoo Messenger.

Extract TẤT CẢ thông tin cá nhân dưới dạng JSON:
{
  "facts": [
    {"category": "education|work|preference|personality|life_event|relationship|location|health|finance", 
     "key": "tên_fact_cụ_thể", "value": "giá_trị_chi_tiết",
     "period": "năm hoặc giai đoạn nếu fact chỉ đúng ở thời điểm đó, null nếu fact luôn đúng"}
  ]
}

QUAN TRỌNG về period:
- Fact LUÔN ĐÚNG (tên, sở thích, tính cách) → period: null
- Fact CHỈ ĐÚNG ở thời điểm chat (đang đi học, đang thực tập, đang ở đâu) → period: "2012" hoặc "2010-2011"
- Nhìn date trong chat (--- YYYY-MM-DD ---) để xác định period

Chú ý extract:
- Trường học, ngành học, lớp, thời gian tốt nghiệp
- Công việc, internship, project
- Sở thích cụ thể (bài hát, ban nhạc, thành viên yêu thích)
- Thói quen (giờ online, giờ ngủ)
- Tính cách thể hiện qua chat
- Địa điểm, nơi ở
- Mối quan hệ (gia đình, bạn bè, người quen chung)
- Tài chính, sức khỏe nếu nhắc đến

Chỉ trả JSON. Extract CHI TIẾT, đừng bỏ sót."""

PASS2_EPISODES_PROMPT = """Phân tích đoạn chat giữa Ngọc Anh (hypersonic3k) và Tommy Filan.

Extract CÁC SỰ KIỆN ĐÁNG NHỚ dưới dạng JSON:
{
  "episodes": [
    {"summary": "tóm tắt chi tiết sự kiện", "emotion": "happy|sad|stressed|excited|romantic|angry|worried|neutral", 
     "importance": 1-10, "date": "YYYY-MM-DD"}
  ]
}

Chú ý các sự kiện:
- Lần đầu gặp, lần đầu gọi anh/em
- Những đêm chat khuya đặc biệt
- Giận nhau, hòa lại
- Sự kiện Westlife (concert, album mới, off FC)
- Thi cử, tốt nghiệp, đi làm
- Vui buồn, lo lắng, chia sẻ
- Thay đổi quan trọng trong mối quan hệ

Chỉ trả JSON."""

PASS3_VOCAB_PROMPT = """Phân tích đoạn chat của Tommy Filan (người nói, không phải hypersonic3k).

Extract CÁCH NÓI ĐẶC TRƯNG của Tommy dưới dạng JSON:
{
  "vocabulary": [
    {"phrase": "câu nói nguyên văn của Tommy", "context": "greeting|goodbye|reaction|affection|worry|teasing|agreement|disagreement|surprise"}
  ],
  "patterns": {
    "common_endings": ["những từ Tommy hay kết thúc câu"],
    "pet_names": ["cách Tommy gọi anh"],
    "emoticons": ["emoticons Tommy hay dùng"],
    "abbreviations": ["viết tắt Tommy hay dùng"]
  }
}

CHỈ extract từ tin nhắn của Tommy Filan, KHÔNG phải hypersonic3k.
Extract nguyên văn, giữ nguyên viết tắt và emoticons.
Chỉ trả JSON."""

PASS4_DYNAMICS_PROMPT = """Phân tích MỐI QUAN HỆ giữa Ngọc Anh (hypersonic3k) và Tommy Filan qua đoạn chat này.

Trả JSON:
{
  "dynamics": [
    {"period": "thời kỳ (vd: 2010-2011, đầu quen, khi yêu nhau)", 
     "description": "mô tả mối quan hệ giai đoạn này",
     "sentiment": "warm|close|distant|romantic|tense|friendly|intimate"}
  ],
  "relationship_style": "nhận xét tổng thể cách hai người tương tác"
}

Chỉ trả JSON."""


async def extract_memories_batch(conversations: list[dict], assistant_id, progress_callback=None):
    """Multi-pass extraction using Sonnet for deep analysis."""
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    model = settings.claude_smart_model  # Sonnet for quality

    def report(msg):
        logger.info(msg)
        if progress_callback:
            progress_callback(msg)

    all_facts = []
    all_episodes = []
    all_vocab = []
    all_dynamics = []

    batch_size = 5  # Smaller batches for depth
    total_batches = (len(conversations) + batch_size - 1) // batch_size

    for i in range(0, len(conversations), batch_size):
        batch = conversations[i:i+batch_size]
        batch_num = i // batch_size + 1

        # Build chat text (no message limit per conversation)
        chat_text = ""
        for conv in batch:
            date_str = conv['date'].strftime('%Y-%m-%d')
            chat_text += f"\n--- {date_str} ---\n"
            for msg in conv['messages']:
                chat_text += f"{msg['sender']}: {msg['content']}\n"

        if len(chat_text) < 50:
            continue

        # Limit to ~15000 chars per call
        chat_text = chat_text[:15000]

        report(f"Batch {batch_num}/{total_batches} — extracting facts...")

        # Pass 1: Facts
        facts_data = await _call_extract(client, model, PASS1_FACTS_PROMPT, chat_text)
        if facts_data:
            all_facts.extend(facts_data.get("facts", []))

        # Pass 2: Episodes
        episodes_data = await _call_extract(client, model, PASS2_EPISODES_PROMPT, chat_text)
        if episodes_data:
            all_episodes.extend(episodes_data.get("episodes", []))

        # Pass 3: Vocabulary (every 3rd batch to avoid too many duplicates)
        if batch_num % 3 == 1:
            vocab_data = await _call_extract(client, model, PASS3_VOCAB_PROMPT, chat_text)
            if vocab_data:
                all_vocab.extend(vocab_data.get("vocabulary", []))

        # Pass 4: Dynamics (every 5th batch)
        if batch_num % 5 == 1:
            dynamics_data = await _call_extract(client, model, PASS4_DYNAMICS_PROMPT, chat_text)
            if dynamics_data:
                all_dynamics.extend(dynamics_data.get("dynamics", []))

    # Save to DB
    async with async_session() as db:
        # Facts (deduplicate by key+period)
        seen_keys = set()
        for fact in all_facts:
            key = fact.get("key", "")
            period = fact.get("period") or None
            dedup_key = f"{key}|{period}"
            if key and dedup_key not in seen_keys:
                seen_keys.add(dedup_key)
                await memory.upsert_profile_fact(
                    db, assistant_id,
                    category=fact.get("category", "general"),
                    key=key, value=fact.get("value", ""),
                    period=period,
                )

        # Episodes
        for ep in all_episodes:
            if ep.get("summary"):
                occurred = None
                if ep.get("date"):
                    try:
                        occurred = datetime.strptime(ep["date"], "%Y-%m-%d")
                    except ValueError:
                        pass
                await memory.save_episode(
                    db, assistant_id,
                    summary=ep["summary"],
                    emotion=ep.get("emotion"),
                    importance=ep.get("importance", 5),
                    occurred_at=occurred,
                )

        # Vocabulary (deduplicate by phrase)
        seen_phrases = set()
        for v in all_vocab:
            phrase = v.get("phrase", "").strip()
            if phrase and phrase not in seen_phrases and len(phrase) > 1:
                seen_phrases.add(phrase)
                await memory.save_vocabulary(
                    db, assistant_id, phrase=phrase,
                    context=v.get("context", "general"),
                )

        # Dynamics
        for d in all_dynamics:
            if d.get("description"):
                await memory.save_dynamics(
                    db, assistant_id,
                    period=d.get("period", "unknown"),
                    description=d["description"],
                    sentiment=d.get("sentiment"),
                )

        await db.commit()

    return {
        "facts": len(seen_keys),
        "episodes": len(all_episodes),
        "vocabulary": len(seen_phrases),
        "dynamics": len(all_dynamics),
    }


async def _call_extract(client, model, system_prompt, chat_text) -> dict | None:
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": chat_text}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        return json.loads(raw.strip())
    except Exception as e:
        logger.warning(f"Extraction failed: {e}")
        return None


# ─── Main ───

async def main(filepath: str):
    await init_db()

    async with async_session() as db:
        result = await db.execute(select(Assistant).where(Assistant.active == True))
        assistant = result.scalar_one_or_none()
        if not assistant:
            print("❌ No active assistant. Run seed first.")
            return

        channel = await memory.get_or_create_channel(db, "yahoo_messenger", "hypersonic3k")
        await db.commit()
        assistant_id = assistant.id
        channel_id = channel.id

    print(f"📂 Parsing {filepath}...")
    conversations = parse_ym_chat(filepath)
    print(f"📊 Found {len(conversations)} conversations")

    print(f"📥 Importing to DB...")
    imported = await import_conversations(conversations, assistant_id, channel_id)
    print(f"✅ Imported {imported} messages")

    print(f"🧠 Deep extraction via Sonnet (multi-pass)...")
    result = await extract_memories_batch(conversations, assistant_id)
    print(f"✅ Facts: {result['facts']}, Episodes: {result['episodes']}, "
          f"Vocabulary: {result['vocabulary']}, Dynamics: {result['dynamics']}")


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/tommy_filan.txt"
    asyncio.run(main(filepath))
