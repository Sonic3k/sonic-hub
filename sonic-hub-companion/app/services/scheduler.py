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


# ─── Follow-up check (2x/day: 9h, 20h local) ───

FOLLOW_UP_PROMPT = """Bạn là {nickname}. {personality}

Dưới đây là danh sách tasks đang mở của user. Hãy quyết định task nào cần HỎI THĂM.

Nguyên tắc:
- Task quan trọng/quá hạn → nên hỏi
- Task nhỏ (mua đồ lặt vặt) → hỏi 1 lần hoặc không cần
- Đã hỏi nhiều lần (3+) mà chưa done → giảm tần suất, đừng spam
- Task mới tạo hôm nay → chưa cần hỏi
- Viết tin nhắn tự nhiên, đúng tính cách, ngắn gọn

Thời gian hiện tại: {now}

Tasks:
{tasks_context}

Trả JSON:
{{"follow_ups": [{{"task_id": "uuid", "message": "tin nhắn hỏi thăm"}}]}}
Nếu không cần hỏi task nào, trả: {{"follow_ups": []}}"""


async def check_follow_ups():
    """Run at 9h and 20h local. LLM decides which tasks to follow up."""
    local_now = now_local()
    hour = local_now.hour
    minute = local_now.minute

    # Only trigger at 9:00-9:04 and 20:00-20:04
    if not ((hour == 9 and minute < 5) or (hour == 20 and minute < 5)):
        return

    dedup_key = f"followup:{local_now.strftime('%Y-%m-%d')}:{hour}"
    if dedup_key in _reminded:
        return
    _reminded.add(dedup_key)

    logger.info(f"Follow-up check triggered at {hour}:00")

    from app.services.telegram import bot_manager

    if not bot_manager.bots:
        return

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)
        enabled = [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]

    if not enabled:
        return

    # Get all open tasks
    tasks = await hub_client.get_tasks()
    open_tasks = [t for t in (tasks or []) if t.get("status") not in ("DONE", "CLOSED")]

    if not open_tasks:
        return

    # Get recent entries for follow-up history
    entries = await hub_client.get_recent_entries(days=30)

    for assistant in enabled:
        bot_app = bot_manager.bots.get(str(assistant.id))
        if not bot_app:
            continue

        # Build context per task
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

        tasks_context = "\n".join(task_lines)

        # Build prompt
        async with async_session() as db:
            personality = await memory_service.get_active_personality(db, assistant.id)

        personality_text = memory_service.format_personality_for_prompt(personality)

        prompt = FOLLOW_UP_PROMPT.format(
            nickname=assistant.nickname,
            personality=personality_text,
            now=local_now.strftime("%Y-%m-%d %H:%M (%A)"),
            tasks_context=tasks_context,
        )

        # Call LLM — uses assistant's configured provider
        import json
        result = await llm_service.chat(
            prompt,
            [{"role": "user", "content": "(system: follow-up check)"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )

        # Parse follow_ups from response
        follow_ups_to_send = []
        raw_messages = result.get("messages", [])

        # Try to extract JSON from first message
        for msg in raw_messages:
            try:
                data = json.loads(msg) if isinstance(msg, str) else msg
                if isinstance(data, dict) and "follow_ups" in data:
                    follow_ups_to_send = data["follow_ups"]
                    break
            except (json.JSONDecodeError, TypeError):
                continue

        # Also check actions format (some models return differently)
        if not follow_ups_to_send and result.get("actions"):
            for action in result["actions"]:
                if action.get("type") == "follow_up":
                    follow_ups_to_send.append({
                        "task_id": action.get("task_id"),
                        "message": action.get("message"),
                    })

        if not follow_ups_to_send:
            logger.info(f"Follow-up: LLM decided no tasks need follow-up")
            return

        # Send messages + create entries
        owner_id = assistant.telegram_owner_id
        for fu in follow_ups_to_send:
            msg = fu.get("message", "")
            task_id = fu.get("task_id", "")
            if not msg or not task_id:
                continue

            try:
                await bot_app.bot.send_message(chat_id=owner_id, text=msg)
                logger.info(f"Follow-up sent: {msg[:50]}...")

                # Record follow-up as entry
                await hub_client.create_entry(
                    entity_type="task",
                    entity_id=task_id,
                    content=msg,
                    entry_type="FOLLOW_UP",
                )
            except Exception as e:
                logger.error(f"Failed to send follow-up: {e}")
