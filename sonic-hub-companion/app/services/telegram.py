"""
Telegram Bot Manager: manages multiple bot instances, one per assistant.
Uses chat config for debounce, typing delay, and reply behavior.
"""
import asyncio
import random
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
from app.core.database import async_session
from app.services.chat import ChatService
from app.services.memory import MemoryService

logger = logging.getLogger(__name__)
chat_service = ChatService()
memory_service = MemoryService()

# Per-chat debounce timers: {chat_id: asyncio.Task}
_debounce_timers: dict[str, asyncio.Task] = {}
# Per-chat message buffers: {chat_id: [messages]}
_message_buffers: dict[str, list[str]] = {}


class BotManager:
    """Manages multiple Telegram bot instances."""

    def __init__(self):
        self.bots: dict[str, Application] = {}

    async def start_all(self):
        async with async_session() as db:
            assistants = await memory_service.get_all_assistants(db)

        for a in assistants:
            if a.telegram_enabled and a.telegram_bot_token:
                await self.start_bot(str(a.id), a.telegram_bot_token, a.telegram_owner_id, a.nickname)

        logger.info(f"BotManager: {len(self.bots)} bot(s) running")

    async def start_bot(self, assistant_id: str, token: str, owner_id: str | None, nickname: str):
        if assistant_id in self.bots:
            await self.stop_bot(assistant_id)

        try:
            app = Application.builder().token(token).build()

            app.bot_data["assistant_id"] = assistant_id
            app.bot_data["owner_id"] = owner_id
            app.bot_data["nickname"] = nickname

            app.add_handler(CommandHandler("start", _handle_start))
            app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _handle_message))

            await app.initialize()
            await app.start()
            await app.updater.start_polling(drop_pending_updates=True)

            self.bots[assistant_id] = app
            logger.info(f"Bot started: {nickname} (assistant: {assistant_id})")

        except Exception as e:
            logger.error(f"Failed to start bot for {nickname}: {e}")

    async def stop_bot(self, assistant_id: str):
        app = self.bots.pop(assistant_id, None)
        if app:
            try:
                await app.updater.stop()
                await app.stop()
                await app.shutdown()
                logger.info(f"Bot stopped: {assistant_id}")
            except Exception as e:
                logger.warning(f"Error stopping bot {assistant_id}: {e}")

    async def stop_all(self):
        for aid in list(self.bots.keys()):
            await self.stop_bot(aid)

    async def restart_bot(self, assistant_id: str):
        async with async_session() as db:
            a = await memory_service.get_assistant_by_id(db, assistant_id)
            if not a:
                return
            if a.telegram_enabled and a.telegram_bot_token:
                await self.start_bot(str(a.id), a.telegram_bot_token, a.telegram_owner_id, a.nickname)
            else:
                await self.stop_bot(assistant_id)

    def get_status(self) -> list[dict]:
        return [{"assistant_id": aid, "running": True} for aid in self.bots]


# ─── Handlers ───

async def _handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    nickname = context.bot_data.get("nickname", "Companion")
    await update.message.reply_text(f"Hi! {nickname} đây 👋")


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return

    assistant_id = context.bot_data.get("assistant_id")
    owner_id = context.bot_data.get("owner_id")

    if owner_id and str(update.message.from_user.id) != str(owner_id):
        await update.message.reply_text("🔒 Unauthorized.")
        return

    chat_id = str(update.message.chat_id)
    text = update.message.text.strip()
    if not text:
        return

    # Load chat config for debounce timing
    config = await _get_config(assistant_id)
    debounce = config.debounce_seconds if config else 10.0

    # Buffer the message
    buf_key = f"{assistant_id}:{chat_id}"
    if buf_key not in _message_buffers:
        _message_buffers[buf_key] = []
    _message_buffers[buf_key].append(text)

    # Cancel previous debounce timer
    if buf_key in _debounce_timers:
        _debounce_timers[buf_key].cancel()

    # Start new debounce timer
    _debounce_timers[buf_key] = asyncio.create_task(
        _debounced_reply(update, context, assistant_id, chat_id, buf_key, debounce, config)
    )


async def _debounced_reply(update, context, assistant_id, chat_id, buf_key, debounce, config):
    """Wait for debounce period, then process all buffered messages."""
    try:
        await asyncio.sleep(debounce)
    except asyncio.CancelledError:
        return  # New message arrived, timer reset

    # Collect buffered messages
    buffered = _message_buffers.pop(buf_key, [])
    _debounce_timers.pop(buf_key, None)

    if not buffered:
        return

    try:
        # Get LLM response
        async with async_session() as db:
            result = await chat_service.handle_message(
                db=db,
                channel_type="telegram",
                external_id=chat_id,
                user_messages=buffered,  # pass list, each saved individually
                assistant_id=assistant_id,
            )

        messages = result.get("messages", [])
        if not messages:
            return

        # Limit reply count based on config weights
        max_replies = _weighted_reply_count(config)
        messages = messages[:max_replies]

        # Simulate response delay (think time before first message)
        think_time = _calc_think_time(messages[0] if messages else "", config)
        await update.message.chat.send_action("typing")
        await asyncio.sleep(think_time)

        # Send each message with typing delay
        for i, msg_text in enumerate(messages):
            if i > 0:
                delay = _calc_typing_delay(msg_text, config)
                await update.message.chat.send_action("typing")
                await asyncio.sleep(delay)

            await update.message.reply_text(msg_text)

    except Exception as e:
        logger.error(f"Chat error (assistant: {assistant_id}): {e}")
        await update.message.reply_text("Ơ lỗi gì rồi, thử lại nha 😅")


# ─── Config helpers ───

async def _get_config(assistant_id: str):
    try:
        async with async_session() as db:
            return await memory_service.get_chat_config(db, assistant_id)
    except Exception:
        return None


def _weighted_reply_count(config) -> int:
    """Pick reply count based on distribution weights."""
    if not config or not config.reply_count_weights:
        return 2
    weights = config.reply_count_weights
    choices = list(range(1, len(weights) + 1))
    return random.choices(choices, weights=weights, k=1)[0]


def _calc_think_time(first_chunk: str, config) -> float:
    """Calculate think time before first reply."""
    if not config:
        return random.uniform(5, 12)

    # Quick reactions get fast response
    if config.quick_reactions and first_chunk.strip() in config.quick_reactions:
        return config.quick_reaction_delay or 1.5

    # Otherwise scale between min and max based on reply length
    length = len(first_chunk)
    ratio = min(length / 80.0, 1.0)
    return config.response_delay_min + ratio * (config.response_delay_max - config.response_delay_min)


def _calc_typing_delay(chunk: str, config) -> float:
    """Calculate delay between consecutive messages (typing speed)."""
    if not config:
        return random.uniform(2, 6)

    length = len(chunk)
    if length <= 5:
        base = config.typing_speed_short or 1.0
    elif length <= 15:
        base = config.typing_speed_medium or 3.0
    elif length <= 30:
        base = config.typing_speed_long or 5.0
    else:
        base = config.typing_speed_xlong or 9.0

    # Add ±30% randomness
    return base * random.uniform(0.7, 1.3)


# Singleton
bot_manager = BotManager()
