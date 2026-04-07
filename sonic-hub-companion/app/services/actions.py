"""
Executes actions returned by LLM against sonic-hub-api.
"""
import logging
from app.services import hub_client

logger = logging.getLogger(__name__)


async def execute_actions(actions: list[dict], assistant_nickname: str) -> list[str]:
    """
    Execute actions from LLM response. Returns list of result messages
    (for logging, not sent to user).
    """
    results = []
    created_by = f"companion:{assistant_nickname}"

    for action in actions:
        action_type = action.get("type", "")
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
                    results.append(f"Created task: {action['title']} (id: {result.get('id')})")

            elif action_type == "update_task":
                result = await hub_client.update_task(
                    action["id"],
                    title=action.get("title"),
                    status=action.get("status"),
                    priority=action.get("priority"),
                )
                if result:
                    results.append(f"Updated task: {action.get('id')}")

            elif action_type == "create_problem":
                result = await hub_client.create_problem(
                    title=action["title"],
                    note=action.get("note"),
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                )
                if result:
                    results.append(f"Created problem: {action['title']} (id: {result.get('id')})")

            elif action_type == "create_todo":
                result = await hub_client.create_todo(
                    title=action["title"],
                    projectId=action.get("project_id"),
                    createdBy=created_by,
                )
                if result:
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

            else:
                logger.warning(f"Unknown action type: {action_type}")

        except Exception as e:
            logger.error(f"Action failed ({action_type}): {e}")
            results.append(f"Failed: {action_type} - {e}")

    return results


def format_hub_context(ctx: dict) -> str:
    """Format sonic-hub data for injection into LLM system prompt."""
    if not ctx:
        return ""

    parts = ["## Sonic Hub - Tình hình hiện tại"]

    # Tasks
    urgent = ctx.get("tasks_urgent", [])
    if urgent:
        parts.append(f"\nTasks urgent ({len(urgent)}):")
        for t in urgent[:5]:
            due = t.get("dueDateTime") or t.get("dueDate") or t.get("duePeriod") or "no deadline"
            parts.append(f"  - [{t.get('priority')}] {t.get('title')} (deadline: {due})")

    open_count = ctx.get("tasks_open", 0)
    if open_count:
        parts.append(f"\nTổng tasks đang mở: {open_count}")

    someday = ctx.get("tasks_someday", [])
    if someday:
        parts.append(f"\nSomeday ({len(someday)}):")
        for t in someday[:3]:
            parts.append(f"  - {t.get('title')}")

    # Problems
    problems = ctx.get("problems_active", [])
    if problems:
        parts.append(f"\nProblems đang theo dõi ({len(problems)}):")
        for p in problems[:5]:
            parts.append(f"  - [{p.get('status')}] {p.get('title')}")

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

    # Wishlists
    wishlists = ctx.get("wishlists", [])
    if wishlists:
        parts.append(f"\nWishlist ({len(wishlists)}):")
        for w in wishlists[:5]:
            cat = f" [{w.get('category')}]" if w.get('category') else ""
            parts.append(f"  - {w.get('title')}{cat}")

    if len(parts) == 1:
        return ""  # No data

    return "\n".join(parts)
