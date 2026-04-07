"""
Timezone utility. DB stores UTC. User interacts in local time.
All conversion goes through here.
"""
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from app.core.config import get_settings


def get_tz() -> ZoneInfo:
    return ZoneInfo(get_settings().user_timezone)


def now_local() -> datetime:
    """Current time in user timezone."""
    return datetime.now(get_tz())


def now_utc() -> datetime:
    """Current time in UTC."""
    return datetime.now(timezone.utc)


def local_to_utc(dt_str: str) -> str:
    """Convert local datetime string to UTC ISO string.
    Input: '2026-04-07T22:00' (naive, assumed local)
    Output: '2026-04-07T15:00:00+00:00' (UTC)
    """
    if not dt_str:
        return dt_str
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            # Already has timezone, convert to UTC
            return dt.astimezone(timezone.utc).isoformat()
        # Naive → assume local timezone
        local_dt = dt.replace(tzinfo=get_tz())
        return local_dt.astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        return dt_str


def utc_to_local(dt_str: str) -> str:
    """Convert UTC datetime string to local ISO string.
    Input: '2026-04-07T15:00:00+00:00'
    Output: '2026-04-07T22:00:00+07:00'
    """
    if not dt_str:
        return dt_str
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(get_tz()).isoformat()
    except (ValueError, TypeError):
        return dt_str


def utc_to_local_display(dt_str: str) -> str:
    """Convert UTC to human-readable local time.
    Input: '2026-04-07T15:00:00+00:00'
    Output: '07/04 22:00'
    """
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        local = dt.astimezone(get_tz())
        return local.strftime("%d/%m %H:%M")
    except (ValueError, TypeError):
        return dt_str


def now_local_display() -> str:
    """Current local time formatted for LLM prompt."""
    return now_local().strftime("%Y-%m-%d %H:%M (%A)")
