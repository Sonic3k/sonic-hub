"""
LLM Provider abstraction. Each provider implements the same interface.
Assistant config determines which provider + model to use.
"""
import json
import logging
from abc import ABC, abstractmethod
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Available models per provider (for admin UI dropdown)
PROVIDER_MODELS = {
    "claude": [
        {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5 (fast, cheap)"},
        {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (smart)"},
    ],
    "together": [
        {"id": "meta-llama/Llama-3-70b-chat-hf", "name": "LLaMA 3 70B"},
        {"id": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "name": "LLaMA 3.1 8B Turbo (fast)"},
        {"id": "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "name": "LLaMA 3.1 70B Turbo"},
        {"id": "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", "name": "LLaMA 3.1 405B (best)"},
        {"id": "mistralai/Mixtral-8x7B-Instruct-v0.1", "name": "Mixtral 8x7B"},
        {"id": "mistralai/Mistral-7B-Instruct-v0.3", "name": "Mistral 7B"},
    ],
    "openai": [
        {"id": "gpt-4o", "name": "GPT-4o"},
        {"id": "gpt-4o-mini", "name": "GPT-4o Mini (fast, cheap)"},
    ],
}


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    async def chat(self, system_prompt: str, messages: list[dict], model: str = None) -> dict:
        """
        Call LLM. Returns {"messages": [...], "actions": [...]}.
        """
        pass


class ClaudeProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.default_model = settings.claude_chat_model

    async def chat(self, system_prompt: str, messages: list[dict], model: str = None) -> dict:
        model = model or self.default_model
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            raw = response.content[0].text.strip()
            return _parse_response(raw)
        except Exception as e:
            logger.error(f"Claude API error ({model}): {e}")
            return {"messages": ["Lỗi rồi, thử lại nha 😅"], "actions": []}


class TogetherProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(
            api_key=settings.together_api_key,
            base_url="https://api.together.xyz/v1",
        )
        self.default_model = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"

    async def chat(self, system_prompt: str, messages: list[dict], model: str = None) -> dict:
        model = model or self.default_model
        try:
            oai_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await self.client.chat.completions.create(
                model=model,
                max_tokens=1024,
                messages=oai_messages,
            )
            raw = response.choices[0].message.content.strip()
            return _parse_response(raw)
        except Exception as e:
            logger.error(f"Together API error ({model}): {e}")
            return {"messages": ["Lỗi rồi, thử lại nha 😅"], "actions": []}


class OpenAIProvider(LLMProvider):
    def __init__(self):
        settings = get_settings()
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.default_model = "gpt-4o"

    async def chat(self, system_prompt: str, messages: list[dict], model: str = None) -> dict:
        model = model or self.default_model
        try:
            oai_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await self.client.chat.completions.create(
                model=model,
                max_tokens=1024,
                messages=oai_messages,
            )
            raw = response.choices[0].message.content.strip()
            return _parse_response(raw)
        except Exception as e:
            logger.error(f"OpenAI API error ({model}): {e}")
            return {"messages": ["Lỗi rồi, thử lại nha 😅"], "actions": []}


# ─── Provider factory ───

_providers: dict[str, LLMProvider] = {}


def get_provider(provider_name: str) -> LLMProvider:
    """Get or create provider instance by name."""
    if provider_name not in _providers:
        if provider_name == "claude":
            _providers[provider_name] = ClaudeProvider()
        elif provider_name == "together":
            _providers[provider_name] = TogetherProvider()
        elif provider_name == "openai":
            _providers[provider_name] = OpenAIProvider()
        else:
            logger.warning(f"Unknown provider '{provider_name}', falling back to claude")
            _providers[provider_name] = ClaudeProvider()
    return _providers[provider_name]


# ─── Shared response parser ───

def _parse_response(raw: str) -> dict:
    """Parse JSON response from any provider. Returns {messages: [...], actions: [...]}."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()

    try:
        data = json.loads(text)

        if isinstance(data, dict) and "messages" in data:
            msgs = []
            for item in data["messages"]:
                if isinstance(item, dict) and item.get("text"):
                    msgs.append(item["text"].strip())
                elif isinstance(item, str):
                    msgs.append(item.strip())
            return {
                "messages": msgs or ["..."],
                "actions": data.get("actions", []),
            }

        if isinstance(data, list):
            msgs = []
            for item in data:
                if isinstance(item, dict) and item.get("text"):
                    msgs.append(item["text"].strip())
                elif isinstance(item, str):
                    msgs.append(item.strip())
            if msgs:
                return {"messages": msgs, "actions": []}

    except (json.JSONDecodeError, TypeError):
        pass

    # Fallback: plain text
    if "\n\n" in raw:
        parts = [p.strip() for p in raw.split("\n\n") if p.strip()]
        if parts:
            return {"messages": parts, "actions": []}

    return {"messages": [raw.strip()] if raw.strip() else ["..."], "actions": []}
