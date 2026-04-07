"""
Executes actions returned by LLM against sonic-hub-api.
"""
import logging
from app.services import hub_client

logger = logging.getLogger(__name__)


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

            else:
                logger.warning(f"Unknown action type: {action_type}")

        except Exception as e:
            logger.error(f"Action failed ({action_type}): {e}")
            results.append(f"Failed: {action_type} - {e}")

    return results



def format_hub_context(ctx: dict) -> str:
    """Format sonic-hub data for injection into LLM system prompt. IDs included for actions."""
    if not ctx:
        return ""

    parts = ["## Sonic Hub - Tình hình hiện tại"]

    # All open tasks with IDs
    all_open = ctx.get("all_open_tasks", [])
    if all_open:
        parts.append(f"\nTasks đang mở ({len(all_open)}):")
        for t in all_open[:10]:
            due = t.get("dueDateTime") or t.get("dueDate") or t.get("duePeriod") or ""
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
