import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    await init_db()
    logging.getLogger(__name__).info("sonic-hub-companion started")

    # Start Telegram bots
    from app.services.telegram import bot_manager
    try:
        await bot_manager.start_all()
    except Exception as e:
        logging.getLogger(__name__).warning(f"Telegram bot startup: {e}")

    # Start reminder scheduler
    from app.services.scheduler import start_scheduler
    scheduler_task = asyncio.create_task(start_scheduler())

    yield

    # Stop scheduler
    scheduler_task.cancel()

    # Stop Telegram bots
    try:
        await bot_manager.stop_all()
    except Exception:
        pass


app = FastAPI(
    title="Sonic Hub Companion",
    description="AI Companion service with memory and personality",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=True)
