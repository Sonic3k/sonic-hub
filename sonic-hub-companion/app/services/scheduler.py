"""
Reminder Scheduler: runs in background, checks for upcoming deadlines 
and tracking rule reminders, sends proactive messages via Telegram.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from app.services import hub_client
from app.services.llm import LLMService
from app.services.memory import MemoryService
from app.core.database import async_session

logger = logging.getLogger(__name__)
llm_service = LLMService()
memory_service = MemoryService()

# Track what we've already reminded to avoid spam
_reminded: set[str] = set()  # "task:{id}:deadline", "rule:{id}:2026-04-07"


async def start_scheduler():
    """Start the reminder check loop."""
    logger.info("Reminder scheduler started (every 60s)")
    while True:
        try:
            await check_reminders()
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
        await asyncio.sleep(60)


async def check_reminders():
    """Check for tasks and rules that need reminders."""
    now = datetime.utcnow()

    # 1. Task deadline reminders (30 min before dueDateTime)
    tasks = await hub_client.get_tasks()
    for task in (tasks or []):
        if task.get("status") in ("DONE", "CLOSED"):
            continue
        due_str = task.get("dueDateTime")
        if not due_str:
            continue

        try:
            due = datetime.fromisoformat(due_str.replace("Z", "+00:00").replace("+00:00", ""))
        except (ValueError, TypeError):
            continue

        minutes_until = (due - now).total_seconds() / 60
        remind_key = f"task:{task['id']}:deadline"

        # Remind 30 minutes before
        if 0 < minutes_until <= 30 and remind_key not in _reminded:
            _reminded.add(remind_key)
            await send_proactive_reminder(
                context=f"Task sắp đến hạn: '{task['title']}' lúc {due_str}. Nhắc user nhẹ nhàng.",
                task_title=task["title"],
            )

        # Remind when overdue
        overdue_key = f"task:{task['id']}:overdue"
        if minutes_until < -5 and minutes_until > -60 and overdue_key not in _reminded:
            _reminded.add(overdue_key)
            await send_proactive_reminder(
                context=f"Task đã quá hạn: '{task['title']}' hạn lúc {due_str}. Nhắc user nhưng đừng áp lực.",
                task_title=task["title"],
            )

    # 2. Tracking rule reminders
    rules = await hub_client.get_reminder_rules()
    today = now.strftime("%Y-%m-%d")

    for rule in (rules or []):
        rule_key = f"rule:{rule['id']}:{today}"
        if rule_key in _reminded:
            continue

        pattern = rule.get("reminderPattern", "")
        should_remind = False

        if pattern == "daily_morning" and 7 <= now.hour <= 9:
            should_remind = True
        elif pattern == "every_3_days":
            # Simple: remind if day of year % 3 == 0
            if now.timetuple().tm_yday % 3 == 0 and 8 <= now.hour <= 10:
                should_remind = True
        elif pattern == "weekly_checkin":
            # Monday morning
            if now.weekday() == 0 and 8 <= now.hour <= 10:
                should_remind = True

        if should_remind:
            _reminded.add(rule_key)
            msg = rule.get("reminderMessage") or f"Nhắc nhở về {rule.get('entityType')}"
            await send_proactive_reminder(
                context=f"Tracking rule reminder: {msg}",
                task_title=msg,
            )

    # Cleanup old reminded keys (keep only last 24h worth)
    if len(_reminded) > 500:
        _reminded.clear()


async def send_proactive_reminder(context: str, task_title: str):
    """Generate natural reminder message via LLM and send to Telegram."""
    from app.services.telegram import bot_manager

    # Find first enabled bot
    if not bot_manager.bots:
        logger.warning("No active Telegram bots for reminder")
        return

    # Get assistant info
    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)
        enabled = [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]

    if not enabled:
        return

    for assistant in enabled:
        bot_app = bot_manager.bots.get(str(assistant.id))
        if not bot_app:
            continue

        # Generate natural message
        personality = []
        async with async_session() as db:
            personality = await memory_service.get_active_personality(db, assistant.id)

        personality_text = memory_service.format_personality_for_prompt(personality)

        prompt = f"""Bạn là {assistant.nickname}. {personality_text}

Bạn cần NHẮC user 1 việc. Viết tin nhắn tự nhiên, ngắn gọn, đúng tính cách.
Context: {context}

Trả JSON: {{"messages": [{{"text": "..."}}], "actions": []}}"""

        result = await llm_service.chat(prompt, [{"role": "user", "content": f"(system: reminder cho '{task_title}')"}])
        messages = result.get("messages", [f"a ơi nhớ {task_title} nha ạ :)"])

        # Send via Telegram
        owner_id = assistant.telegram_owner_id
        try:
            for msg in messages:
                await bot_app.bot.send_message(chat_id=owner_id, text=msg)
            logger.info(f"Reminder sent via {assistant.nickname}: {task_title}")
        except Exception as e:
            logger.error(f"Failed to send reminder: {e}")
