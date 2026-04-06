"""
Import Yahoo Messenger chat history into companion DB.
Usage: python -m app.import_chat <path_to_txt>

1. Parse YM format → conversations + messages
2. Batch extract memories via Claude API
"""
import asyncio
import re
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from sqlalchemy import select
from anthropic import AsyncAnthropic
from app.core.database import init_db, async_session
from app.core.config import get_settings
from app.services.memory import MemoryService
from app.models.models import Assistant, Channel, Conversation, Message

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
memory = MemoryService()

# ─── Parser ───

def parse_ym_chat_from_text(raw: str) -> list[dict]:
    """Parse Yahoo Messenger chat from text string."""
    lines = raw.replace('\r\n', '\n').split('\n')
    return _parse_lines(lines)


def parse_ym_chat(filepath: str) -> list[dict]:
    """Parse Yahoo Messenger exported chat from file."""
    try:
        with open(filepath, 'r', encoding='utf-16') as f:
            raw = f.read()
    except UnicodeError:
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

        # Date separator
        date_match = date_pattern.match(line)
        if date_match:
            if current_messages and current_date:
                conversations.append({
                    'date': current_date,
                    'messages': current_messages,
                })
            try:
                current_date = datetime.strptime(date_match.group(1), '%b %d, %Y %I:%M:%S %p')
            except ValueError:
                current_date = None
            current_messages = []
            continue

        # Message
        msg_match = msg_pattern.match(line)
        if msg_match and current_date:
            time_str = msg_match.group(1)
            sender = msg_match.group(2)
            content = msg_match.group(3).strip()

            # Clean HTML emoticons
            content = re.sub(r'<[^>]+>', '', content).strip()
            if not content:
                continue

            try:
                msg_time = datetime.strptime(time_str, '%I:%M:%S %p')
                timestamp = current_date.replace(
                    hour=msg_time.hour, minute=msg_time.minute, second=msg_time.second
                )
            except ValueError:
                timestamp = current_date

            role = 'user' if sender == 'hypersonic3k' else 'assistant'
            current_messages.append({
                'role': role,
                'content': content,
                'timestamp': timestamp,
                'sender': sender,
            })

    # Last conversation
    if current_messages and current_date:
        conversations.append({'date': current_date, 'messages': current_messages})

    return conversations


# ─── Import to DB ───

async def import_conversations(conversations: list[dict], assistant_id, channel_id):
    """Import parsed conversations into DB."""
    total_msgs = 0
    async with async_session() as db:
        for conv_data in conversations:
            if not conv_data['messages']:
                continue

            conv = Conversation(
                assistant_id=assistant_id,
                channel_id=channel_id,
                started_at=conv_data['date'],
                ended_at=conv_data['messages'][-1]['timestamp'],
                is_active=False,
            )
            db.add(conv)
            await db.flush()

            for msg in conv_data['messages']:
                m = Message(
                    conversation_id=conv.id,
                    role=msg['role'],
                    content=msg['content'],
                    timestamp=msg['timestamp'],
                    channel_type='yahoo_messenger',
                )
                db.add(m)
                total_msgs += 1

        await db.commit()
    return total_msgs


# ─── Extract Memories via Claude ───

EXTRACT_PROMPT = """Phân tích đoạn chat giữa Ngọc Anh (hypersonic3k) và Tommy Filan (Bùi Tố Lan) - họ là người yêu/bạn thân.
Chat này từ Yahoo Messenger khoảng năm 2010-2013.

Hãy extract thông tin quan trọng dưới dạng JSON:
{
  "facts": [
    {"category": "relationship|preference|personality|life_event|work|education", "key": "tên_fact", "value": "giá_trị"}
  ],
  "episodes": [
    {"summary": "tóm tắt sự kiện", "emotion": "happy|sad|stressed|excited|romantic|neutral", "importance": 1-10, "date": "YYYY-MM-DD nếu biết"}
  ],
  "relationship_insights": "nhận xét ngắn về mối quan hệ từ đoạn chat này"
}

Chỉ extract những gì ĐÁNG NHỚ và CỤ THỂ. Bỏ qua small talk vô nghĩa.
Chỉ trả JSON, không giải thích."""


async def extract_memories_batch(conversations: list[dict], assistant_id):
    """Batch extract memories from historical conversations."""
    settings = get_settings()
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    all_facts = []
    all_episodes = []

    # Group conversations into batches (~20 convos per batch)
    batch_size = 20
    for i in range(0, len(conversations), batch_size):
        batch = conversations[i:i+batch_size]
        chat_text = ""
        for conv in batch:
            date_str = conv['date'].strftime('%Y-%m-%d')
            chat_text += f"\n--- {date_str} ---\n"
            for msg in conv['messages'][:30]:  # limit per conversation
                sender = msg['sender']
                chat_text += f"{sender}: {msg['content']}\n"

        if len(chat_text) < 50:
            continue

        try:
            response = await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=EXTRACT_PROMPT,
                messages=[{"role": "user", "content": chat_text[:8000]}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            data = json.loads(raw.strip())

            all_facts.extend(data.get("facts", []))
            all_episodes.extend(data.get("episodes", []))

            insight = data.get("relationship_insights", "")
            if insight:
                logger.info(f"Batch {i//batch_size + 1}: {insight}")

        except Exception as e:
            logger.warning(f"Batch {i//batch_size + 1} extraction failed: {e}")
            continue

    # Save to DB
    async with async_session() as db:
        # Deduplicate facts by key
        seen_keys = set()
        for fact in all_facts:
            key = fact.get("key", "")
            if key and key not in seen_keys:
                seen_keys.add(key)
                await memory.upsert_profile_fact(
                    db, assistant_id,
                    category=fact.get("category", "general"),
                    key=key, value=fact.get("value", ""),
                )

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
                )
                if occurred:
                    # Update the episode's occurred_at
                    pass  # already set by default

        await db.commit()

    return len(seen_keys), len(all_episodes)


# ─── Main ───

async def main(filepath: str):
    await init_db()

    # Get Tommy assistant
    async with async_session() as db:
        result = await db.execute(select(Assistant).where(Assistant.active == True))
        assistant = result.scalar_one_or_none()
        if not assistant:
            print("❌ No active assistant. Run seed first.")
            return

        # Create YM channel
        channel = await memory.get_or_create_channel(db, "yahoo_messenger", "hypersonic3k")
        await db.commit()

        assistant_id = assistant.id
        channel_id = channel.id

    print(f"📂 Parsing {filepath}...")
    conversations = parse_ym_chat(filepath)
    print(f"📊 Found {len(conversations)} conversations")

    total_msgs = sum(len(c['messages']) for c in conversations)
    print(f"💬 Total messages: {total_msgs}")

    print(f"📥 Importing to DB...")
    imported = await import_conversations(conversations, assistant_id, channel_id)
    print(f"✅ Imported {imported} messages")

    print(f"🧠 Extracting memories via Claude API...")
    facts_count, episodes_count = await extract_memories_batch(conversations, assistant_id)
    print(f"✅ Extracted {facts_count} facts, {episodes_count} episodes")

    print(f"\n🎉 Done! Tommy now remembers your Yahoo Messenger history.")


if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/tommy_filan.txt"
    asyncio.run(main(filepath))
