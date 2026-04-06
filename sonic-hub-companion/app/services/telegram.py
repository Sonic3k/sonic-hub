"""
Telegram Bot Manager: manages multiple bot instances, one per assistant.
Each assistant with telegram_enabled=True gets its own polling bot.
"""
import asyncio
import asyncio
import logging
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
from app.core.database import async_session
from app.services.chat import ChatService
from app.services.memory import MemoryService

logger = logging.getLogger(__name__)
chat_service = ChatService()
memory_service = MemoryService()


class BotManager:
    """Manages multiple Telegram bot instances."""

    def __init__(self):
        self.bots: dict[str, Application] = {}  # assistant_id -> Application

    async def start_all(self):
        """Load all telegram-enabled assistants and start their bots."""
        async with async_session() as db:
            assistants = await memory_service.get_all_assistants(db)

        for a in assistants:
            if a.telegram_enabled and a.telegram_bot_token:
                await self.start_bot(str(a.id), a.telegram_bot_token, a.telegram_owner_id, a.nickname)

        logger.info(f"BotManager: {len(self.bots)} bot(s) running")

    async def start_bot(self, assistant_id: str, token: str, owner_id: str | None, nickname: str):
        """Start a single bot for an assistant."""
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
        """Stop a single bot."""
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
        """Stop all bots."""
        for aid in list(self.bots.keys()):
            await self.stop_bot(aid)

    async def restart_bot(self, assistant_id: str):
        """Restart a bot after config change."""
        async with async_session() as db:
            a = await memory_service.get_assistant_by_id(db, assistant_id)
            if not a:
                return
            if a.telegram_enabled and a.telegram_bot_token:
                await self.start_bot(str(a.id), a.telegram_bot_token, a.telegram_owner_id, a.nickname)
            else:
                await self.stop_bot(assistant_id)

    def get_status(self) -> list[dict]:
        """Get status of all running bots."""
        return [
            {"assistant_id": aid, "running": True}
            for aid in self.bots
        ]


# ─── Handlers ───

async def _handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    nickname = context.bot_data.get("nickname", "Companion")
    await update.message.reply_text(f"Hi! {nickname} đây 👋")


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return

    assistant_id = context.bot_data.get("assistant_id")
    owner_id = context.bot_data.get("owner_id")

    # Auth check
    if owner_id and str(update.message.from_user.id) != str(owner_id):
        await update.message.reply_text("🔒 Unauthorized.")
        return

    chat_id = str(update.message.chat_id)
    text = update.message.text.strip()

    if not text:
        return

    try:
        async with async_session() as db:
            result = await chat_service.handle_message(
                db=db,
                channel_type="telegram",
                external_id=chat_id,
                user_message=text,
                assistant_id=assistant_id,
            )

        # Send reply chunks
        for chunk in result.get("split", [result.get("reply", "")]):
            await update.message.reply_text(chunk)

    except Exception as e:
        logger.error(f"Chat error (assistant: {assistant_id}): {e}")
        await update.message.reply_text("Ơ lỗi gì rồi, thử lại nha 😅")


# Singleton
bot_manager = BotManager()
