"""
Reminder Scheduler: checks tracking rules and sends proactive messages via Telegram.
DB stores UTC. remindTime/remindDaysOfWeek are in user's local timezone.
"""
import asyncio
import logging
from datetime import datetime, timezone
from app.services import hub_client
from app.services.llm import LLMService
from app.services.memory import MemoryService
from app.core.database import async_session
from app.core.tz import now_utc, now_local
from app.core.tz import utc_to_local_display

logger = logging.getLogger(__name__)
llm_service = LLMService()
memory_service = MemoryService()

_reminded: set[str] = set()


async def start_scheduler():
    logger.info("Reminder scheduler started (every 60s)")
    while True:
        try:
            await check_reminders()
            await check_follow_ups()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(60)


async def check_reminders():
    utc_now = now_utc().replace(tzinfo=None)  # naive UTC for DB comparison
    local_now = now_local()
    today_str = local_now.strftime("%Y-%m-%d")
    current_dow = local_now.isoweekday()
    current_time = local_now.strftime("%H:%M")  # local time for remindTime/dow

    rules = await hub_client.get_reminder_rules()

    for rule in (rules or []):
        rule_id = rule.get("id")

        # ─── remindBeforeMinutes: compare with DB dueDateTime (UTC) ───
        remind_before = rule.get("remindBeforeMinutes")
        if remind_before:
            key = f"rule:{rule_id}:before:{today_str}"
            if key not in _reminded:
                entity_due = await _get_entity_due(rule.get("entityType"), rule.get("entityId"))
                if entity_due:
                    minutes_until = (entity_due - utc_now).total_seconds() / 60
                    if 0 < minutes_until <= remind_before:
                        _reminded.add(key)
                        await _send_reminder(rule, f"Còn {int(minutes_until)} phút")

        # ─── remindAt: one-time exact reminder (stored as UTC) ───
        remind_at_str = rule.get("remindAt")
        if remind_at_str:
            key = f"rule:{rule_id}:at"
            if key not in _reminded:
                try:
                    remind_at = datetime.fromisoformat(remind_at_str.replace("Z", "").replace("+00:00", ""))
                    diff = (utc_now - remind_at).total_seconds() / 60
                    if 0 <= diff <= 5:
                        _reminded.add(key)
                        await _send_reminder(rule, "Đến giờ rồi")
                except (ValueError, TypeError):
                    pass

        # ─── remindIntervalDays: every N days (lastRemindedAt is UTC) ───
        interval = rule.get("remindIntervalDays")
        if interval:
            key = f"rule:{rule_id}:interval:{today_str}"
            if key not in _reminded:
                last = rule.get("lastRemindedAt")
                should_remind = False
                if not last:
                    should_remind = True
                else:
                    try:
                        last_dt = datetime.fromisoformat(last.replace("Z", "").replace("+00:00", ""))
                        days_since = (utc_now - last_dt).days
                        should_remind = days_since >= interval
                    except (ValueError, TypeError):
                        should_remind = True

                # remindTime is LOCAL time (e.g. "08:00" Vietnam)
                remind_time = rule.get("remindTime", "08:00")
                if should_remind and current_time >= remind_time and current_time <= _add_minutes(remind_time, 5):
                    _reminded.add(key)
                    await _send_reminder(rule, f"Nhắc định kỳ ({interval} ngày)")
                    # Update lastRemindedAt (fire and forget)
                    asyncio.create_task(_update_last_reminded(rule_id))

        # ─── remindDaysOfWeek: specific days ───
        dow_str = rule.get("remindDaysOfWeek")
        if dow_str:
            key = f"rule:{rule_id}:dow:{today_str}"
            if key not in _reminded:
                try:
                    days = [int(d.strip()) for d in dow_str.split(",")]
                    if current_dow in days:
                        remind_time = rule.get("remindTime", "08:00")
                        if current_time >= remind_time and current_time <= _add_minutes(remind_time, 5):
                            _reminded.add(key)
                            await _send_reminder(rule, "Nhắc theo lịch")
                except (ValueError, TypeError):
                    pass

    # Cleanup
    if len(_reminded) > 500:
        _reminded.clear()


async def _get_entity_due(entity_type: str, entity_id: str) -> datetime | None:
    """Get dueDateTime of an entity (naive local datetime)."""
    if entity_type == "task":
        tasks = await hub_client.get_tasks()
        for t in (tasks or []):
            if str(t.get("id")) == str(entity_id):
                due = t.get("dueDateTime")
                if due:
                    try:
                        return datetime.fromisoformat(due.replace("Z", "").replace("+00:00", ""))
                    except (ValueError, TypeError):
                        pass
    return None


async def _update_last_reminded(rule_id: str):
    """Update lastRemindedAt on the tracking rule."""
    try:
        await hub_client._request(
            "PUT", f"/api/tracking-rules/{rule_id}",
            json={"entityType": "task", "remindIntervalDays": 1}  # trigger update
        )
    except Exception:
        pass


def _add_minutes(time_str: str, minutes: int) -> str:
    """Add minutes to HH:MM string."""
    try:
        h, m = map(int, time_str.split(":"))
        total = h * 60 + m + minutes
        return f"{total // 60:02d}:{total % 60:02d}"
    except (ValueError, TypeError):
        return "23:59"


async def _send_reminder(rule: dict, context: str):
    """Generate natural message via LLM and send to all enabled Telegram bots."""
    from app.services.telegram import bot_manager

    if not bot_manager.bots:
        logger.warning("No active Telegram bots for reminder")
        return

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)
        enabled = [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]

    if not enabled:
        return

    message = rule.get("reminderMessage", "")

    for assistant in enabled:
        bot_app = bot_manager.bots.get(str(assistant.id))
        if not bot_app:
            continue

        # Generate natural message
        async with async_session() as db:
            personality = await memory_service.get_active_personality(db, assistant.id)

        personality_text = memory_service.format_personality_for_prompt(personality)

        prompt = f"""Bạn là {assistant.nickname}. {personality_text}

Bạn cần NHẮC user 1 việc. Viết 1 tin nhắn tự nhiên, ngắn gọn, đúng tính cách.
Nội dung cần nhắc: {message}
Context: {context}

Trả JSON: {{"messages": [{{"text": "..."}}], "actions": []}}"""

        result = await llm_service.chat(
            prompt,
            [{"role": "user", "content": f"(system reminder: {message})"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )
        msgs = result.get("messages", [f"a ơi nhớ {message} nha ạ :)"])

        owner_id = assistant.telegram_owner_id
        try:
            for msg in msgs[:2]:
                await bot_app.bot.send_message(chat_id=owner_id, text=msg)
            logger.info(f"Reminder sent via {assistant.nickname}: {message}")
        except Exception as e:
            logger.error(f"Failed to send reminder: {e}")


# ─── Follow-up system: Analyze (2x/day) + Execute (every 60s) ───

# In-memory queue: [{task_id, message, send_at (naive local), assistant_id}]
_follow_up_queue: list[dict] = []

FOLLOW_UP_PROMPT = """Bạn là {nickname}. {personality}

Dưới đây là danh sách tasks đang mở của user. Hãy lên LỊCH HỎI THĂM cho hôm nay.

Nguyên tắc:
- Task quan trọng/quá hạn → nên hỏi, chọn giờ phù hợp
- Task nhỏ (mua đồ lặt vặt) → hỏi 1 lần hoặc không cần
- Đã hỏi nhiều lần (3+) mà chưa done → giảm tần suất, đừng spam
- Task mới tạo hôm nay → chưa cần hỏi
- Chọn giờ hỏi tự nhiên (đừng hỏi lúc ngủ, đừng dồn hết 1 lúc)
- Viết tin nhắn tự nhiên, đúng tính cách, ngắn gọn

Thời gian hiện tại: {now}
Khung giờ còn lại hôm nay: {time_window}

Tasks:
{tasks_context}

Trả JSON (CHỈ JSON, không text khác):
{{"follow_ups": [{{"task_id": "uuid", "message": "tin nhắn hỏi thăm", "send_at": "HH:MM"}}]}}
Nếu không cần hỏi task nào hôm nay: {{"follow_ups": []}}"""


async def check_follow_ups():
    """Called every 60s. Handles both analyze + execute."""
    local_now = now_local()
    hour = local_now.hour
    minute = local_now.minute

    # Phase 1: Analyze at 9:00 and 20:00
    if (hour == 9 or hour == 20) and minute < 5:
        dedup_key = f"followup-analyze:{local_now.strftime('%Y-%m-%d')}:{hour}"
        if dedup_key not in _reminded:
            _reminded.add(dedup_key)
            await _analyze_follow_ups(local_now)

    # Phase 2: Execute queued follow-ups
    await _execute_follow_ups(local_now)


async def _analyze_follow_ups(local_now):
    """LLM analyzes tasks → schedules follow-ups for the day."""
    logger.info(f"Follow-up analysis triggered at {local_now.strftime('%H:%M')}")

    from app.services.telegram import bot_manager
    if not bot_manager.bots:
        return

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)
        enabled = [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]

    if not enabled:
        return

    tasks = await hub_client.get_tasks()
    open_tasks = [t for t in (tasks or []) if t.get("status") not in ("DONE", "CLOSED")]
    if not open_tasks:
        return

    entries = await hub_client.get_recent_entries(days=30)

    for assistant in enabled:
        if not bot_manager.bots.get(str(assistant.id)):
            continue

        # Build context
        task_lines = []
        for task in open_tasks:
            task_id = str(task.get("id"))
            follow_ups = [e for e in entries
                         if str(e.get("entityId")) == task_id
                         and e.get("entryType") == "FOLLOW_UP"]

            due_display = utc_to_local_display(task.get("dueDateTime")) if task.get("dueDateTime") else "không có deadline"
            last_fu = utc_to_local_display(follow_ups[0].get("createdAt")) if follow_ups else "chưa hỏi"

            task_lines.append(
                f"- [id:{task_id}] [{task.get('priority')}] {task.get('title')} "
                f"| deadline: {due_display} | đã hỏi: {len(follow_ups)} lần | lần cuối: {last_fu}"
            )

        # Time window
        hour = local_now.hour
        if hour <= 12:
            time_window = "9:00 - 22:00"
        else:
            time_window = f"{hour}:00 - 22:00"

        async with async_session() as db:
            personality = await memory_service.get_active_personality(db, assistant.id)

        prompt = FOLLOW_UP_PROMPT.format(
            nickname=assistant.nickname,
            personality=memory_service.format_personality_for_prompt(personality),
            now=local_now.strftime("%Y-%m-%d %H:%M (%A)"),
            time_window=time_window,
            tasks_context="\n".join(task_lines),
        )

        result = await llm_service.chat(
            prompt,
            [{"role": "user", "content": "(system: follow-up analysis)"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )

        # Parse scheduled follow-ups
        import json
        scheduled = []
        raw_messages = result.get("messages", [])
        for msg in raw_messages:
            try:
                data = json.loads(msg) if isinstance(msg, str) else msg
                if isinstance(data, dict) and "follow_ups" in data:
                    scheduled = data["follow_ups"]
                    break
            except (json.JSONDecodeError, TypeError):
                continue

        # Add to queue
        today = local_now.strftime("%Y-%m-%d")
        for fu in scheduled:
            send_at_str = fu.get("send_at", "")
            if not send_at_str or not fu.get("task_id") or not fu.get("message"):
                continue
            _follow_up_queue.append({
                "task_id": fu["task_id"],
                "message": fu["message"],
                "send_at": f"{today}T{send_at_str}:00",
                "assistant_id": str(assistant.id),
            })

        logger.info(f"Follow-up: scheduled {len(scheduled)} follow-ups for today")


async def _execute_follow_ups(local_now):
    """Check queue, send any follow-ups that are due."""
    if not _follow_up_queue:
        return

    from app.services.telegram import bot_manager
    now_str = local_now.strftime("%Y-%m-%dT%H:%M")

    sent = []
    for i, fu in enumerate(_follow_up_queue):
        send_at = fu.get("send_at", "")[:16]  # "2026-04-08T11:00"
        if send_at <= now_str:
            assistant_id = fu["assistant_id"]
            bot_app = bot_manager.bots.get(assistant_id)
            if not bot_app:
                sent.append(i)
                continue

            # Get assistant for owner_id
            async with async_session() as db:
                assistant = await memory_service.get_assistant_by_id(db, assistant_id)

            if not assistant or not assistant.telegram_owner_id:
                sent.append(i)
                continue

            try:
                await bot_app.bot.send_message(
                    chat_id=assistant.telegram_owner_id,
                    text=fu["message"],
                )
                logger.info(f"Follow-up sent: {fu['message'][:50]}...")

                # Record as FOLLOW_UP entry
                await hub_client.create_entry(
                    entity_type="task",
                    entity_id=fu["task_id"],
                    content=fu["message"],
                    entry_type="FOLLOW_UP",
                )
            except Exception as e:
                logger.error(f"Failed to send follow-up: {e}")

            sent.append(i)

    # Remove sent items (reverse to preserve indices)
    for i in sorted(sent, reverse=True):
        _follow_up_queue.pop(i)
