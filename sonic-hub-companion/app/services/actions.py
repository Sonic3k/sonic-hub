"""
Executes actions returned by LLM against sonic-hub-api.
LLM outputs local time → executor converts to UTC before API calls.
"""
import logging
from app.services import hub_client
from app.services.memory import MemoryService
from app.core.tz import local_to_utc

logger = logging.getLogger(__name__)
memory_service = MemoryService()


def _convert_datetimes(action: dict) -> dict:
    """Convert local datetime fields to UTC before saving to DB."""
    for key in ("due_date_time", "dueDateTime", "remind_at", "remindAt"):
        if key in action and action[key]:
            action[key] = local_to_utc(action[key])
    return action


async def execute_actions(actions: list[dict], assistant_nickname: str) -> list[str]:
    """
    Execute actions sequentially. Supports $last_task, $last_problem, $last_todo
    references for chaining (e.g. create_task → create_tracking_rule for that task).
    """
    results = []
    created_by = f"companion:{assistant_nickname}"

    # Track last created IDs for chaining
    last_ids: dict[str, str] = {}  # "task" -> "uuid", "problem" -> "uuid", etc.

    for action in actions:
        action_type = action.get("type", "")

        # Resolve $last_* references
        for key in ("entity_id", "id"):
            val = action.get(key, "")
            if isinstance(val, str) and val.startswith("$last_"):
                ref_type = val.replace("$last_", "")
                resolved = last_ids.get(ref_type)
                if resolved:
                    action[key] = resolved
                else:
                    logger.warning(f"Cannot resolve {val} — no {ref_type} created yet")
                    continue

        try:
            # Convert local datetimes to UTC
            action = _convert_datetimes(action)

            if action_type == "create_task":
                result = await hub_client.create_task(
                    title=action["title"],
                    description=action.get("description"),
                    priority=action.get("priority", "MEDIUM"),
                    dueDate=action.get("due_date"),
                    dueDateTime=action.get("due_date_time"),
                    duePeriod=action.get("due_period"),
                    someday=action.get("someday", False),
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                    remind_before_minutes=action.get("remind_before_minutes"),
                    remind_interval_days=action.get("remind_interval_days"),
                    remind_days_of_week=action.get("remind_days_of_week"),
                    remind_time=action.get("remind_time"),
                    reminder_message=action.get("reminder_message"),
                )
                if result:
                    last_ids["task"] = str(result.get("id"))
                    results.append(f"Created task: {action['title']} (id: {result.get('id')})")

            elif action_type == "update_task":
                kwargs = {}
                for k in ("title", "status", "priority", "description",
                          "dueDate", "dueDateTime", "duePeriod", "someday"):
                    api_key = k
                    if k == "due_date": api_key = "dueDate"
                    elif k == "due_date_time": api_key = "dueDateTime"
                    elif k == "due_period": api_key = "duePeriod"
                    val = action.get(k) or action.get(api_key)
                    if val is not None:
                        kwargs[api_key] = val
                result = await hub_client.update_task(action["id"], **kwargs)
                if result:
                    results.append(f"Updated task: {action['id']}")

            elif action_type == "create_problem":
                result = await hub_client.create_problem(
                    title=action["title"],
                    note=action.get("note"),
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                    frequency_type=action.get("frequency_type"),
                    current_limit=action.get("current_limit"),
                    target_limit=action.get("target_limit"),
                    remind_before_minutes=action.get("remind_before_minutes"),
                    remind_interval_days=action.get("remind_interval_days"),
                    remind_days_of_week=action.get("remind_days_of_week"),
                    remind_time=action.get("remind_time"),
                    reminder_message=action.get("reminder_message"),
                )
                if result:
                    last_ids["problem"] = str(result.get("id"))
                    results.append(f"Created problem: {action['title']} (id: {result.get('id')})")

            elif action_type == "create_todo":
                result = await hub_client.create_todo(
                    title=action["title"],
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                )
                if result:
                    last_ids["todo"] = str(result.get("id"))
                    results.append(f"Created todo: {action['title']}")

            elif action_type == "create_entry":
                result = await hub_client.create_entry(
                    entity_type=action["entity_type"],
                    entity_id=action["entity_id"],
                    content=action["content"],
                    entry_type=action.get("entry_type", "NOTE"),
                    createdBy=created_by,
                )
                if result:
                    results.append(f"Created entry on {action['entity_type']}")

            elif action_type == "create_tracking_rule":
                result = await hub_client.create_tracking_rule(
                    entity_type=action["entity_type"],
                    entity_id=action["entity_id"],
                    frequencyType=action.get("frequency_type"),
                    currentLimit=action.get("current_limit"),
                    targetLimit=action.get("target_limit"),
                    reminderPattern=action.get("reminder_pattern"),
                    reminderMessage=action.get("reminder_message"),
                )
                if result:
                    results.append(f"Created tracking rule for {action['entity_type']}")

            elif action_type == "mark_done":
                entity = action.get("entity_type", "task")
                if entity == "todo":
                    await hub_client.mark_todo_done(action["id"])
                else:
                    await hub_client.update_task(action["id"], status="DONE")
                results.append(f"Marked {entity} done: {action['id']}")

            elif action_type == "create_wishlist":
                result = await hub_client.create_wishlist(
                    title=action["title"],
                    description=action.get("description"),
                    category=action.get("category", "general"),
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                )
                if result:
                    results.append(f"Created wishlist: {action['title']} (id: {result.get('id')})")

            elif action_type == "update_task":
                kwargs = {}
                for k in ("title", "status", "priority", "description",
                          "dueDate", "dueDateTime", "duePeriod", "someday"):
                    # Map snake_case from LLM to camelCase for API
                    api_key = k
                    if k == "due_date": api_key = "dueDate"
                    elif k == "due_date_time": api_key = "dueDateTime"
                    elif k == "due_period": api_key = "duePeriod"
                    val = action.get(k) or action.get(api_key)
                    if val is not None:
                        kwargs[api_key] = val
                result = await hub_client.update_task(action["id"], **kwargs)
                if result:
                    results.append(f"Updated task: {action['id']}")

            elif action_type == "delete_task":
                await hub_client.delete_task(action["id"])
                results.append(f"Deleted task: {action['id']}")

            elif action_type == "delete_problem":
                await hub_client.delete_problem(action["id"])
                results.append(f"Deleted problem: {action['id']}")

            elif action_type == "delete_todo":
                await hub_client.delete_todo(action["id"])
                results.append(f"Deleted todo: {action['id']}")

            elif action_type == "update_todo":
                await hub_client.update_todo(action["id"], title=action.get("title"))
                results.append(f"Updated todo: {action['id']}")

            elif action_type == "update_problem":
                kwargs = {}
                for k in ("title", "note", "status"):
                    val = action.get(k)
                    if val is not None:
                        kwargs[k] = val
                await hub_client.update_problem(action["id"], **kwargs)
                results.append(f"Updated problem: {action['id']}")

            elif action_type == "update_wishlist":
                kwargs = {}
                for k in ("title", "description", "category", "archived"):
                    val = action.get(k)
                    if val is not None:
                        kwargs[k] = val
                await hub_client.update_wishlist(action["id"], **kwargs)
                results.append(f"Updated wishlist: {action['id']}")

            elif action_type == "delete_wishlist":
                await hub_client.delete_wishlist(action["id"])
                results.append(f"Deleted wishlist: {action['id']}")

            elif action_type == "update_daily_log":
                from app.models.models import DailyLog
                from app.core.database import async_session
                from app.core.tz import now_local
                from sqlalchemy import select

                today = now_local().date()
                items = action.get("items", [])
                reflection = action.get("reflection")

                # Find assistant_id from context
                async with async_session() as db:
                    assistants = await memory_service.get_all_assistants(db)
                    assistant = next((a for a in assistants if a.nickname == assistant_nickname), None)
                    if not assistant:
                        continue

                    existing = await db.execute(
                        select(DailyLog).where(
                            DailyLog.assistant_id == assistant.id,
                            DailyLog.date == today,
                        )
                    )
                    log = existing.scalar_one_or_none()

                    if log:
                        # Merge items
                        existing_items = log.items or []
                        existing_items.extend(items)
                        log.items = existing_items
                        if reflection:
                            log.reflection = reflection
                    else:
                        log = DailyLog(
                            assistant_id=assistant.id,
                            date=today,
                            items=items,
                            reflection=reflection,
                        )
                        db.add(log)

                    await db.commit()
                results.append(f"Updated daily log: {len(items)} items")

            else:
                logger.warning(f"Unknown action type: {action_type}")

        except Exception as e:
            logger.error(f"Action failed ({action_type}): {e}")
            results.append(f"Failed: {action_type} - {e}")

    return results



def format_hub_context(ctx: dict) -> str:
    """Format sonic-hub data for injection into LLM system prompt. IDs included for actions."""
    from app.core.tz import utc_to_local_display

    if not ctx:
        return ""

    parts = ["## Sonic Hub - Tình hình hiện tại"]

    all_open = ctx.get("all_open_tasks", [])
    if all_open:
        parts.append(f"\nTasks đang mở ({len(all_open)}):")
        for t in all_open[:10]:
            due_raw = t.get("dueDateTime") or t.get("dueDate") or t.get("duePeriod") or ""
            # dueDateTime stored as UTC naive → convert to local display
            due = utc_to_local_display(due_raw) if t.get("dueDateTime") else due_raw
            due_str = f" | deadline: {due}" if due else ""
            someday_str = " | someday" if t.get("someday") else ""
            source = f" | by: {t.get('createdBy')}" if t.get("createdBy") else ""
            parts.append(f"  - [id:{t.get('id')}] [{t.get('priority')}] {t.get('title')}{due_str}{someday_str}{source}")

    # Problems with IDs
    problems = ctx.get("problems_active", [])
    if problems:
        parts.append(f"\nProblems ({len(problems)}):")
        for p in problems[:5]:
            parts.append(f"  - [id:{p.get('id')}] [{p.get('status')}] {p.get('title')}")

    # Todos with IDs
    todos = ctx.get("todos_open", [])
    if todos:
        parts.append(f"\nTodos chưa xong ({len(todos)}):")
        for t in todos[:5]:
            parts.append(f"  - [id:{t.get('id')}] {t.get('title')}")

    # Recent entries
    entries = ctx.get("recent_entries", [])
    if entries:
        parts.append(f"\nEntries gần đây:")
        for e in entries[:5]:
            parts.append(f"  - [{e.get('entryType')}] {e.get('entityType')}: {e.get('content', '')[:80]}")

    # Tracking rules
    rules = ctx.get("tracking_rules", [])
    if rules:
        parts.append(f"\nTracking rules:")
        for r in rules[:5]:
            limit = f"{r.get('currentLimit')}/{r.get('frequencyType')}" if r.get('currentLimit') else ""
            target = f" → target {r.get('targetLimit')}" if r.get('targetLimit') else ""
            parts.append(f"  - {r.get('entityType')}: {limit}{target} (reminder: {r.get('reminderPattern', 'none')})")

    # Wishlists with IDs
    wishlists = ctx.get("wishlists", [])
    if wishlists:
        parts.append(f"\nWishlist ({len(wishlists)}):")
        for w in wishlists[:5]:
            cat = f" [{w.get('category')}]" if w.get('category') else ""
            parts.append(f"  - [id:{w.get('id')}] {w.get('title')}{cat}")

    if len(parts) == 1:
        return ""

    return "\n".join(parts)
