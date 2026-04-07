"""
HTTP client for sonic-hub-api. Used by companion to create/update tasks, problems, entries.
"""
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
BASE_URL = settings.sonic_hub_api_url.rstrip("/")


async def _request(method: str, path: str, json: dict = None, params: dict = None) -> dict | list | None:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.request(method, f"{BASE_URL}{path}", json=json, params=params)
            resp.raise_for_status()
            return resp.json() if resp.text else None
    except Exception as e:
        logger.error(f"sonic-hub-api {method} {path} failed: {e}")
        return None


# ─── Tasks ───

async def create_task(title: str, **kwargs) -> dict | None:
    body = {"title": title}
    for k in ("description", "status", "priority", "dueDate", "dueDateTime",
              "duePeriod", "someday", "projectId", "tagIds", "createdBy"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/tasks", json=body)


async def update_task(task_id: str, **kwargs) -> dict | None:
    return await _request("PUT", f"/api/tasks/{task_id}", json=kwargs)


async def get_tasks(status: str = None) -> list:
    params = {"status": status} if status else None
    return await _request("GET", "/api/tasks", params=params) or []


async def delete_task(task_id: str) -> dict | None:
    return await _request("DELETE", f"/api/tasks/{task_id}")


# ─── Problems ───

async def create_problem(title: str, **kwargs) -> dict | None:
    body = {"title": title}
    for k in ("note", "status", "projectId", "tagIds", "createdBy"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/problems", json=body)


async def update_problem(problem_id: str, **kwargs) -> dict | None:
    return await _request("PUT", f"/api/problems/{problem_id}", json=kwargs)


async def get_problems(status: str = None) -> list:
    params = {"status": status} if status else None
    return await _request("GET", "/api/problems", params=params) or []


async def delete_problem(problem_id: str) -> dict | None:
    return await _request("DELETE", f"/api/problems/{problem_id}")


# ─── Todos ───

async def create_todo(title: str, **kwargs) -> dict | None:
    body = {"title": title}
    for k in ("projectId", "tagIds", "createdBy"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/todos", json=body)


async def mark_todo_done(todo_id: str) -> dict | None:
    return await _request("PATCH", f"/api/todos/{todo_id}/done")


async def get_todos() -> list:
    return await _request("GET", "/api/todos") or []


async def delete_todo(todo_id: str) -> dict | None:
    return await _request("DELETE", f"/api/todos/{todo_id}")


# ─── Entries ───

async def create_entry(entity_type: str, entity_id: str, content: str, entry_type: str = "NOTE", **kwargs) -> dict | None:
    body = {
        "entityType": entity_type,
        "entityId": entity_id,
        "content": content,
        "entryType": entry_type,
    }
    for k in ("projectId", "tagIds", "createdBy"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/entries", json=body)


async def get_recent_entries(days: int = 7) -> list:
    return await _request("GET", "/api/entries/recent", params={"days": days}) or []


# ─── Wishlists ───

async def create_wishlist(title: str, **kwargs) -> dict | None:
    body = {"title": title}
    for k in ("description", "category", "projectId", "tagIds", "createdBy"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/wishlists", json=body)


async def get_wishlists(archived: bool = False) -> list:
    return await _request("GET", "/api/wishlists", params={"archived": archived}) or []


# ─── Tracking Rules ───

async def get_active_rules() -> list:
    return await _request("GET", "/api/tracking-rules/active") or []


async def get_reminder_rules() -> list:
    return await _request("GET", "/api/tracking-rules/reminders") or []


async def create_tracking_rule(entity_type: str, entity_id: str, **kwargs) -> dict | None:
    body = {"entityType": entity_type, "entityId": entity_id}
    for k in ("frequencyType", "currentLimit", "targetLimit",
              "reminderPattern", "reminderMessage", "projectId"):
        if k in kwargs and kwargs[k] is not None:
            body[k] = kwargs[k]
    return await _request("POST", "/api/tracking-rules", json=body)


# ─── Context for LLM ───

async def get_companion_context() -> dict:
    """Pull current state from sonic-hub-api for LLM context injection."""
    tasks = await get_tasks()
    problems = await get_problems()
    todos = await get_todos()
    entries = await get_recent_entries(3)
    rules = await get_active_rules()
    wishlists = await get_wishlists()

    open_tasks = [t for t in tasks if t.get("status") in ("OPEN", "IN_PROGRESS")]
    active_problems = [p for p in problems if p.get("status") in ("NEW", "INVESTIGATING")]
    open_todos = [t for t in todos if not t.get("done")]

    return {
        "all_open_tasks": open_tasks,
        "problems_active": active_problems,
        "todos_open": open_todos,
        "recent_entries": entries[:10],
        "tracking_rules": rules,
        "wishlists": wishlists,
    }
