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

logger = logging.getLogger(__name__)
llm_service = LLMService()
memory_service = MemoryService()

_reminded: set[str] = set()


async def start_scheduler():
    logger.info("Reminder scheduler started (every 60s)")
    while True:
        try:
            await check_reminders()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(60)


async def check_reminders():
    utc_now = now_utc()
    local_now = now_local()
    today_str = local_now.strftime("%Y-%m-%d")
    current_dow = local_now.isoweekday()  # 1=Mon, 7=Sun
    current_time = local_now.strftime("%H:%M")

    rules = await hub_client.get_reminder_rules()

    for rule in (rules or []):
        rule_id = rule.get("id")

        # ─── remindBeforeMinutes: check entity dueDateTime ───
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

        # ─── remindAt: one-time exact reminder ───
        remind_at_str = rule.get("remindAt")
        if remind_at_str:
            key = f"rule:{rule_id}:at"
            if key not in _reminded:
                try:
                    remind_at = datetime.fromisoformat(remind_at_str.replace("Z", "+00:00"))
                    if remind_at.tzinfo is None:
                        remind_at = remind_at.replace(tzinfo=timezone.utc)
                    diff = (utc_now - remind_at).total_seconds() / 60
                    if 0 <= diff <= 5:  # within 5 min window
                        _reminded.add(key)
                        await _send_reminder(rule, "Đến giờ rồi")
                except (ValueError, TypeError):
                    pass

        # ─── remindIntervalDays: every N days ───
        interval = rule.get("remindIntervalDays")
        if interval:
            key = f"rule:{rule_id}:interval:{today_str}"
            if key not in _reminded:
                last = rule.get("lastRemindedAt")
                should_remind = False
                if not last:
                    should_remind = True  # never reminded
                else:
                    try:
                        last_dt = datetime.fromisoformat(last.replace("Z", ""))
                        days_since = (utc_now - last_dt).days
                        should_remind = days_since >= interval
                    except (ValueError, TypeError):
                        should_remind = True

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
    """Get dueDateTime of an entity (returns UTC-aware datetime)."""
    if entity_type == "task":
        tasks = await hub_client.get_tasks()
        for t in (tasks or []):
            if str(t.get("id")) == str(entity_id):
                due = t.get("dueDateTime")
                if due:
                    try:
                        dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        return dt
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
            [{"role": "user", "content": f"(system reminder: {message})"}]
        )
        msgs = result.get("messages", [f"a ơi nhớ {message} nha ạ :)"])

        owner_id = assistant.telegram_owner_id
        try:
            for msg in msgs[:2]:
                await bot_app.bot.send_message(chat_id=owner_id, text=msg)
            logger.info(f"Reminder sent via {assistant.nickname}: {message}")
        except Exception as e:
            logger.error(f"Failed to send reminder: {e}")
