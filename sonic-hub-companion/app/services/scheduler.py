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


async def _get_schedule_config(assistant_id, schedule_type: str) -> dict:
    """Get schedule config for assistant. Returns {enabled: bool, config: dict}."""
    from app.models.models import ScheduleConfig
    from sqlalchemy import select
    defaults = {
        "reminders": {"enabled": True, "config": {}},
        "follow_ups": {"enabled": True, "config": {"plan_hours": [9, 20]}},
        "journal": {"enabled": True, "config": {"hour": 4}},
        "daily_log": {"enabled": True, "config": {"hour": 22}},
    }
    try:
        async with async_session() as db:
            result = await db.execute(
                select(ScheduleConfig).where(
                    ScheduleConfig.assistant_id == assistant_id,
                    ScheduleConfig.schedule_type == schedule_type,
                )
            )
            config = result.scalar_one_or_none()
            if config:
                return {"enabled": config.enabled, "config": config.config or {}}
    except Exception:
        pass
    return defaults.get(schedule_type, {"enabled": True, "config": {}})


async def start_scheduler():
    logger.info("Reminder scheduler started (every 60s)")
    while True:
        try:
            await check_reminders()
            await check_follow_ups()
            await check_journal()
            await check_daily_log()
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
    """Generate natural message via LLM and send via the correct assistant."""
    from app.services.telegram import bot_manager

    if not bot_manager.bots:
        return

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)
        enabled = [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]

    if not enabled:
        return

    # Find which assistant should handle this reminder
    # Match task's createdBy (e.g. "companion:Tommy Filan") with assistant nickname
    entity_id = rule.get("entityId")
    target_assistant = None

    if entity_id:
        tasks = await hub_client.get_tasks()
        for t in (tasks or []):
            if str(t.get("id")) == str(entity_id):
                created_by = t.get("createdBy", "")
                for a in enabled:
                    if a.nickname and a.nickname.lower() in created_by.lower():
                        target_assistant = a
                        break
                break

    # Fallback: first enabled assistant
    if not target_assistant:
        target_assistant = enabled[0]

    bot_app = bot_manager.bots.get(str(target_assistant.id))
    if not bot_app:
        return

    message = rule.get("reminderMessage", "")

    async with async_session() as db:
        personality = await memory_service.get_active_personality(db, target_assistant.id)

    prompt = f"""Bạn là {target_assistant.nickname}. {memory_service.format_personality_for_prompt(personality)}

Bạn cần NHẮC user 1 việc. Viết 1 tin nhắn tự nhiên, ngắn gọn, đúng tính cách.
Nội dung cần nhắc: {message}
Context: {context}

Trả JSON: {{"messages": [{{"text": "..."}}], "actions": []}}"""

    result = await llm_service.chat(
        prompt,
        [{"role": "user", "content": f"(system reminder: {message})"}],
        provider_name=target_assistant.llm_provider or "claude",
        model=target_assistant.llm_model,
    )
    msgs = result.get("messages", [message or "nhắc việc nè"])

    try:
        for msg in msgs[:2]:
            await bot_app.bot.send_message(chat_id=target_assistant.telegram_owner_id, text=msg)
        logger.info(f"Reminder sent via {target_assistant.nickname}: {message}")
    except Exception as e:
        logger.error(f"Failed to send reminder: {e}")


# ─── Daily Interaction System: Plan (2x/day) + Execute (every 60s) ───

# In-memory queue: [{type, task_id?, draft_message, send_at, assistant_id}]
_interaction_queue: list[dict] = []

PLAN_PROMPT = """Bạn là {nickname}. {personality}

Hãy lên KẾ HOẠCH TƯƠNG TÁC với user cho phần còn lại hôm nay. Hãy hành xử đúng tính cách và mối quan hệ của bạn với user.

## Context đầy đủ
Thời gian hiện tại: {now}
Khung giờ còn lại: {time_window}

### Cuộc trò chuyện gần đây:
{recent_chat}

### Trạng thái hiện tại:
{conversation_state}

### Tasks đang mở:
{tasks_context}

## Loại tương tác:
- follow_up: hỏi thăm tiến độ task (CẦN task_id)
- casual: tán gẫu, hỏi thăm sức khỏe, chia sẻ, thể hiện quan tâm
- check_in: hỏi thăm tổng quát ("hôm nay thế nào")

## Nguyên tắc:
- Xen kẽ hỏi task + tán gẫu, KHÔNG dồn hết follow_up
- Task có "đã nhắc hôm nay" hoặc "có reminder tự động" gần deadline → SKIP
- Task đã hỏi 3+ lần → giảm, đừng spam
- Nếu gần đây mood buồn/stress → ưu tiên casual hỏi thăm trước
- Nếu lâu không chat (>1 ngày) → bắt đầu nhẹ nhàng, đừng hỏi task ngay
- Chọn giờ tự nhiên, không dồn cùng lúc, không quá 3-4 interactions/ngày
- Tin nhắn ngắn gọn, đúng tính cách

Trả JSON (CHỈ JSON):
{{"interactions": [
  {{"type": "casual", "send_at": "HH:MM", "message": "draft tin nhắn"}},
  {{"type": "follow_up", "task_id": "uuid", "send_at": "HH:MM", "message": "draft"}}
]}}
Nếu hôm nay không cần tương tác: {{"interactions": []}}"""

EXECUTE_PROMPT = """Bạn là {nickname}. {personality}

Bạn đã lên kế hoạch gửi tin nhắn này:
Loại: {interaction_type}
Draft: "{draft_message}"

Nhưng TRƯỚC KHI gửi, hãy xem tình hình hiện tại:
- Lần cuối user chat: {last_user_msg}
- Lần cuối bạn chat: {last_bot_msg}
- Conversation đang: {conv_status}
- Tin nhắn gần nhất: {recent_snippet}

Quyết định:
1. GỬI — viết lại tin nhắn cho phù hợp tình huống hiện tại
2. SKIP — không cần gửi (đã nói chuyện về topic này rồi, hoặc không phù hợp)

Trả JSON (CHỈ JSON):
{{"action": "send", "messages": [{{"text": "tin nhắn cuối cùng"}}]}}
hoặc
{{"action": "skip", "reason": "lý do"}}"""


async def check_follow_ups():
    """Called every 60s. Handles both plan + execute."""
    local_now = now_local()
    hour = local_now.hour
    minute = local_now.minute

    # Phase 1: Plan — check per-assistant config for plan_hours
    if minute < 5:
        async with async_session() as db:
            assistants = await memory_service.get_all_assistants(db)
            for assistant in assistants:
                cfg = await _get_schedule_config(assistant.id, "follow_ups")
                if not cfg["enabled"]:
                    continue
                plan_hours = cfg["config"].get("plan_hours", [9, 20])
                if hour in plan_hours:
                    dedup_key = f"plan:{local_now.strftime('%Y-%m-%d')}:{hour}:{assistant.id}"
                    if dedup_key not in _reminded:
                        _reminded.add(dedup_key)
                        await _plan_daily_interactions(local_now, assistant)

    # Phase 2: Execute queued interactions
    await _execute_interactions(local_now)


async def _plan_daily_interactions(local_now, assistant):
    """LLM plans the day's interactions for one assistant."""
    logger.info(f"Daily interaction plan triggered for {assistant.nickname} at {local_now.strftime('%H:%M')}")

    from app.services.telegram import bot_manager
    if not bot_manager.bots or not bot_manager.bots.get(str(assistant.id)):
        return
    if not assistant.telegram_enabled or not assistant.telegram_owner_id:
        return

    tasks = await hub_client.get_tasks()
    open_tasks = [t for t in (tasks or []) if t.get("status") not in ("DONE", "CLOSED")]
    entries = await hub_client.get_recent_entries(days=30)
    rules = await hub_client.get_reminder_rules()
    today_str = local_now.strftime("%Y-%m-%d")

    reminder_task_ids = set()
    for rule in (rules or []):
        if rule.get("entityType") == "task":
            reminder_task_ids.add(str(rule.get("entityId")))

    # Build task context
    task_lines = []
    for task in open_tasks:
        task_id = str(task.get("id"))
        follow_ups = [e for e in entries
                     if str(e.get("entityId")) == task_id
                     and e.get("entryType") == "FOLLOW_UP"]
        reminders_today = [e for e in entries
                          if str(e.get("entityId")) == task_id
                          and e.get("entryType") == "REMINDER"
                          and e.get("createdAt", "").startswith(today_str)]

        due_display = utc_to_local_display(task.get("dueDateTime")) if task.get("dueDateTime") else "không có deadline"
        last_fu = utc_to_local_display(follow_ups[0].get("createdAt")) if follow_ups else "chưa hỏi"

        flags = []
        if task_id in reminder_task_ids:
            flags.append("có reminder tự động")
        if reminders_today:
            flags.append("đã nhắc hôm nay")
        flags_str = f" | {', '.join(flags)}" if flags else ""

        task_lines.append(
            f"- [id:{task_id}] [{task.get('priority')}] {task.get('title')} "
            f"| deadline: {due_display} | đã hỏi: {len(follow_ups)} lần | lần cuối: {last_fu}{flags_str}"
        )

    tasks_context = "\n".join(task_lines) if task_lines else "(Không có task nào)"

    # Get conversation state
    from app.models.models import ConversationState
    from sqlalchemy import select
    async with async_session() as db:
        result = await db.execute(
            select(ConversationState).where(ConversationState.assistant_id == assistant.id)
        )
        state = result.scalar_one_or_none()

    if state and state.last_user_message_at:
        diff = (local_now.replace(tzinfo=None) - state.last_user_message_at)
        hours_ago = diff.total_seconds() / 3600
        if hours_ago < 1:
            conv_state_text = f"Vừa chat {int(hours_ago * 60)} phút trước"
        elif hours_ago < 24:
            conv_state_text = f"Chat {int(hours_ago)} giờ trước"
        else:
            conv_state_text = f"Lâu không chat ({int(hours_ago / 24)} ngày)"
        if state.current_mood:
            conv_state_text += f" | Mood: {state.current_mood}"
        if state.current_topic:
            conv_state_text += f" | Topic: {state.current_topic}"
    else:
        conv_state_text = "Chưa có thông tin"

    # Get recent chat messages
    recent_chat = "Không có tin nhắn gần đây"
    async with async_session() as db:
        from app.models.models import Conversation, Message as MsgModel
        from sqlalchemy import desc
        conv_result = await db.execute(
            select(Conversation)
            .where(Conversation.assistant_id == assistant.id)
            .order_by(desc(Conversation.started_at))
            .limit(1)
        )
        recent_conv = conv_result.scalar_one_or_none()
        if recent_conv:
            msg_result = await db.execute(
                select(MsgModel)
                .where(MsgModel.conversation_id == recent_conv.id)
                .order_by(desc(MsgModel.timestamp))
                .limit(10)
            )
            msgs = list(reversed(msg_result.scalars().all()))
            if msgs:
                recent_chat = "\n".join(
                    f"{'User' if m.role == 'user' else assistant.nickname}: {m.content[:80]}"
                    for m in msgs
                )

    # Time window
    hour = local_now.hour
    time_window = f"{hour}:00 - 22:00" if hour > 9 else "9:00 - 22:00"

    async with async_session() as db:
        personality = await memory_service.get_active_personality(db, assistant.id)

    prompt = PLAN_PROMPT.format(
        nickname=assistant.nickname,
        personality=memory_service.format_personality_for_prompt(personality),
        now=local_now.strftime("%Y-%m-%d %H:%M (%A)"),
        time_window=time_window,
        recent_chat=recent_chat,
        conversation_state=conv_state_text,
        tasks_context=tasks_context,
    )

    result = await llm_service.chat(
        prompt,
        [{"role": "user", "content": "(system: daily interaction plan)"}],
        provider_name=assistant.llm_provider or "claude",
        model=assistant.llm_model,
    )

    # Parse interactions
    import json
    scheduled = []
    for msg in result.get("messages", []):
        try:
            data = json.loads(msg) if isinstance(msg, str) else msg
            if isinstance(data, dict) and "interactions" in data:
                scheduled = data["interactions"]
                break
        except (json.JSONDecodeError, TypeError):
            continue

    # Add to queue
    today = local_now.strftime("%Y-%m-%d")
    for item in scheduled:
        send_at_str = item.get("send_at", "")
        if not send_at_str or not item.get("message"):
            continue
        _interaction_queue.append({
            "type": item.get("type", "casual"),
            "task_id": item.get("task_id"),
            "draft_message": item["message"],
            "send_at": f"{today}T{send_at_str}:00",
            "assistant_id": str(assistant.id),
        })

    logger.info(f"Daily plan: scheduled {len(scheduled)} interactions")


async def _execute_interactions(local_now):
    """Check queue, LLM re-evaluates before sending."""
    if not _interaction_queue:
        return

    from app.services.telegram import bot_manager
    now_str = local_now.strftime("%Y-%m-%dT%H:%M")

    sent = []
    for i, item in enumerate(_interaction_queue):
        send_at = item.get("send_at", "")[:16]
        if send_at > now_str:
            continue

        assistant_id = item["assistant_id"]
        bot_app = bot_manager.bots.get(assistant_id)
        if not bot_app:
            sent.append(i)
            continue

        async with async_session() as db:
            assistant = await memory_service.get_assistant_by_id(db, assistant_id)

        if not assistant or not assistant.telegram_owner_id:
            sent.append(i)
            continue

        # Get current conversation state for pre-send check
        from app.models.models import ConversationState, Conversation, Message as MsgModel
        from sqlalchemy import select, desc

        async with async_session() as db:
            state_result = await db.execute(
                select(ConversationState).where(ConversationState.assistant_id == assistant.id)
            )
            state = state_result.scalar_one_or_none()

            # Recent messages (last 5)
            conv_result = await db.execute(
                select(Conversation)
                .where(Conversation.assistant_id == assistant.id)
                .order_by(desc(Conversation.started_at))
                .limit(1)
            )
            recent_conv = conv_result.scalar_one_or_none()
            recent_snippet = "Không có"
            if recent_conv:
                msg_result = await db.execute(
                    select(MsgModel)
                    .where(MsgModel.conversation_id == recent_conv.id)
                    .order_by(desc(MsgModel.timestamp))
                    .limit(5)
                )
                msgs = list(reversed(msg_result.scalars().all()))
                if msgs:
                    recent_snippet = "\n".join(
                        f"{'User' if m.role == 'user' else assistant.nickname}: {m.content[:60]}"
                        for m in msgs
                    )

        # Determine conversation status
        if state and state.last_user_message_at:
            diff_minutes = (local_now.replace(tzinfo=None) - state.last_user_message_at).total_seconds() / 60
            if diff_minutes < 10:
                conv_status = "đang chat (vài phút trước)"
            elif diff_minutes < 60:
                conv_status = f"chat {int(diff_minutes)} phút trước"
            elif diff_minutes < 1440:
                conv_status = f"chat {int(diff_minutes / 60)} giờ trước"
            else:
                conv_status = f"lâu không chat ({int(diff_minutes / 1440)} ngày)"
        else:
            conv_status = "chưa có thông tin"

        last_user_msg = utc_to_local_display(str(state.last_user_message_at)) if state and state.last_user_message_at else "không rõ"
        last_bot_msg = utc_to_local_display(str(state.last_message_at)) if state and state.last_message_at else "không rõ"

        # Pre-send LLM check
        async with async_session() as db:
            personality = await memory_service.get_active_personality(db, assistant.id)

        execute_prompt = EXECUTE_PROMPT.format(
            nickname=assistant.nickname,
            personality=memory_service.format_personality_for_prompt(personality),
            interaction_type=item.get("type", "casual"),
            draft_message=item.get("draft_message", ""),
            last_user_msg=last_user_msg,
            last_bot_msg=last_bot_msg,
            conv_status=conv_status,
            recent_snippet=recent_snippet,
        )

        result = await llm_service.chat(
            execute_prompt,
            [{"role": "user", "content": "(system: pre-send check)"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )

        # Parse LLM decision
        import json
        action = "send"
        final_messages = [item.get("draft_message", "")]

        for msg in result.get("messages", []):
            try:
                data = json.loads(msg) if isinstance(msg, str) else msg
                if isinstance(data, dict):
                    action = data.get("action", "send")
                    if action == "send" and "messages" in data:
                        final_messages = [m["text"] if isinstance(m, dict) else m for m in data["messages"]]
                    break
            except (json.JSONDecodeError, TypeError):
                continue

        if action == "skip":
            logger.info(f"Interaction skipped by LLM: {item.get('draft_message', '')[:40]}...")
            sent.append(i)
            continue

        # Send
        try:
            for msg_text in final_messages[:2]:
                await bot_app.bot.send_message(chat_id=assistant.telegram_owner_id, text=msg_text)
            logger.info(f"Interaction sent ({item.get('type')}): {final_messages[0][:50]}...")

            # Record entry if follow_up
            if item.get("type") == "follow_up" and item.get("task_id"):
                await hub_client.create_entry(
                    entity_type="task",
                    entity_id=item["task_id"],
                    content=final_messages[0],
                    entry_type="FOLLOW_UP",
                )
        except Exception as e:
            logger.error(f"Failed to send interaction: {e}")

        sent.append(i)

    for i in sorted(sent, reverse=True):
        _interaction_queue.pop(i)


# ─── Journal: auto-generate at 4am ───

JOURNAL_PROMPT = """Bạn là {nickname}. {personality}

Hãy viết NHẬT KÝ tổng kết ngày hôm qua của user, theo góc nhìn và giọng văn của bạn.

Dựa trên:
### Conversations (những gì user tâm sự):
{conversations}

### Tasks completed/updated:
{task_activity}

### Entries (activity log):
{entries}

Viết tự nhiên, đúng tính cách. Đây là nhật ký bạn viết VỀ user, không phải tin nhắn gửi user.
Nếu ngày trống (không có hoạt động gì) thì ghi ngắn gọn.

Trả CHỈ nội dung nhật ký, không JSON, không format đặc biệt."""


async def check_journal():
    """Generate journal based on per-assistant config."""
    local_now = now_local()
    if local_now.minute >= 5:
        return

    from app.models.models import Journal, Conversation, Message as MsgModel
    from sqlalchemy import select, desc, and_
    from datetime import timedelta

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)

    for assistant in assistants:
        cfg = await _get_schedule_config(assistant.id, "journal")
        if not cfg["enabled"]:
            continue
        journal_hour = cfg["config"].get("hour", 4)
        if local_now.hour != journal_hour:
            continue

        dedup_key = f"journal:{local_now.strftime('%Y-%m-%d')}:{assistant.id}"
        if dedup_key in _reminded:
            continue
        _reminded.add(dedup_key)

        logger.info(f"Journal generation triggered for {assistant.nickname}")

        # Period: journal_hour yesterday → journal_hour today
        period_end = local_now.replace(hour=journal_hour, minute=0, second=0, microsecond=0).replace(tzinfo=None)
        period_start = period_end - timedelta(days=1)
        yesterday = (local_now - timedelta(days=1)).date()

        entries = await hub_client.get_recent_entries(days=2)
        tasks = await hub_client.get_tasks()

        # Check if already exists
        async with async_session() as db:
            existing = await db.execute(
                select(Journal).where(
                    Journal.assistant_id == assistant.id,
                    Journal.date == yesterday,
                )
            )
            if existing.scalar_one_or_none():
                continue

            # Get conversations in period
            conv_result = await db.execute(
                select(Conversation)
                .where(
                    Conversation.assistant_id == assistant.id,
                    Conversation.started_at >= period_start,
                    Conversation.started_at < period_end,
                )
                .order_by(Conversation.started_at)
            )
            convs = list(conv_result.scalars().all())

            # Get messages from those conversations
            chat_lines = []
            for conv in convs:
                msg_result = await db.execute(
                    select(MsgModel)
                    .where(MsgModel.conversation_id == conv.id)
                    .order_by(MsgModel.timestamp)
                    .limit(30)
                )
                msgs = list(msg_result.scalars().all())
                for m in msgs:
                    role = "User" if m.role == "user" else assistant.nickname
                    chat_lines.append(f"{role}: {m.content[:100]}")

            conversations_text = "\n".join(chat_lines[-40:]) if chat_lines else "Không có conversation"

            # Filter entries for yesterday
            day_entries = [e for e in entries if e.get("createdAt", "").startswith(str(yesterday))]
            entries_text = "\n".join(
                f"- [{e.get('entryType')}] {e.get('content', '')[:80]}"
                for e in day_entries
            ) if day_entries else "Không có entries"

            # Task activity
            task_activity_lines = []
            for t in (tasks or []):
                updated = t.get("updatedAt", "")
                if str(yesterday) in updated:
                    task_activity_lines.append(f"- [{t.get('status')}] {t.get('title')}")
            task_activity = "\n".join(task_activity_lines) if task_activity_lines else "Không có task activity"

            # Generate
            personality = await memory_service.get_active_personality(db, assistant.id)

        prompt = JOURNAL_PROMPT.format(
            nickname=assistant.nickname,
            personality=memory_service.format_personality_for_prompt(personality),
            conversations=conversations_text,
            task_activity=task_activity,
            entries=entries_text,
        )

        result = await llm_service.chat(
            prompt,
            [{"role": "user", "content": f"(system: generate journal for {yesterday})"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )

        content = "\n".join(result.get("messages", ["Ngày yên tĩnh."]))

        # Save
        async with async_session() as db:
            journal = Journal(
                assistant_id=assistant.id,
                date=yesterday,
                content=content,
                period_start=period_start,
                period_end=period_end,
            )
            db.add(journal)
            await db.commit()

        logger.info(f"Journal created for {yesterday} by {assistant.nickname}")


# ─── DailyLog: Tommy asks at 22h ───

DAILYLOG_PROMPT = """Bạn là {nickname}. {personality}

Bây giờ là 22h tối. Hãy hỏi user TỔNG KẾT ngày hôm nay và KẾ HOẠCH ngày mai.

Lưu ý:
{existing_context}

Viết 1-2 tin nhắn ngắn, tự nhiên, đúng tính cách. Đừng hỏi nếu user đã nói rồi.

Trả JSON: {{"messages": [{{"text": "..."}}], "actions": []}}"""


async def check_daily_log():
    """Ask about today/tomorrow based on per-assistant config."""
    local_now = now_local()
    if local_now.minute >= 5:
        return

    from app.services.telegram import bot_manager
    from app.models.models import DailyLog, ConversationState

    if not bot_manager.bots:
        return

    today = local_now.date()

    async with async_session() as db:
        assistants = await memory_service.get_all_assistants(db)

    for assistant in [a for a in assistants if a.telegram_enabled and a.telegram_owner_id]:
        cfg = await _get_schedule_config(assistant.id, "daily_log")
        if not cfg["enabled"]:
            continue
        dl_hour = cfg["config"].get("hour", 22)
        if local_now.hour != dl_hour:
            continue

        dedup_key = f"dailylog:{local_now.strftime('%Y-%m-%d')}:{assistant.id}"
        if dedup_key in _reminded:
            continue
        _reminded.add(dedup_key)

        logger.info(f"DailyLog check triggered for {assistant.nickname}")

        bot_app = bot_manager.bots.get(str(assistant.id))
        if not bot_app:
            continue

        # Check if DailyLog already exists for today (user already updated)
        async with async_session() as db:
            existing = await db.execute(
                select(DailyLog).where(
                    DailyLog.assistant_id == assistant.id,
                    DailyLog.date == today,
                )
            )
            log = existing.scalar_one_or_none()

        if log and log.items:
            logger.info(f"DailyLog already exists for {today}, skipping")
            continue

        # Check recent conversation to see if already discussed
        existing_context = "User chưa nói gì về plan hôm nay."
        async with async_session() as db:
            state_result = await db.execute(
                select(ConversationState).where(ConversationState.assistant_id == assistant.id)
            )
            state = state_result.scalar_one_or_none()
            if state and state.last_user_message_at:
                diff_hours = (local_now.replace(tzinfo=None) - state.last_user_message_at).total_seconds() / 3600
                if diff_hours < 3:
                    existing_context = f"User vừa chat {int(diff_hours * 60)} phút trước. Có thể đã nói về ngày hôm nay."

            personality = await memory_service.get_active_personality(db, assistant.id)

        prompt = DAILYLOG_PROMPT.format(
            nickname=assistant.nickname,
            personality=memory_service.format_personality_for_prompt(personality),
            existing_context=existing_context,
        )

        result = await llm_service.chat(
            prompt,
            [{"role": "user", "content": "(system: daily log prompt at 22h)"}],
            provider_name=assistant.llm_provider or "claude",
            model=assistant.llm_model,
        )

        msgs = result.get("messages", [])
        if not msgs:
            continue

        try:
            for msg in msgs[:2]:
                await bot_app.bot.send_message(chat_id=assistant.telegram_owner_id, text=msg)
            logger.info(f"DailyLog prompt sent by {assistant.nickname}")
        except Exception as e:
            logger.error(f"Failed to send daily log prompt: {e}")
