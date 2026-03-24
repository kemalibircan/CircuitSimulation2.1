"""
app/services/openai/client.py — Centralized OpenAI API wrapper.
Handles retries, rate limits, JSON mode, and response validation.
"""
from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.errors import LLMError
from app.core.logging import get_logger

logger = get_logger(__name__)

_openai_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout,
            max_retries=0,  # we handle retries via tenacity
        )
    return _openai_client


@retry(
    retry=retry_if_exception_type(Exception),
    stop=stop_after_attempt(settings.openai_max_retries),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    reraise=True,
)
async def chat_completion(
    messages: list[dict[str, str]],
    *,
    json_mode: bool = False,
    temperature: float | None = None,
    max_tokens: int = 4096,
    model: str | None = None,
) -> str:
    """
    Send messages to the chat completions endpoint and return the text response.
    If json_mode=True, sets response_format={"type": "json_object"} and
    validates that the response is parseable JSON.
    """
    client = get_openai_client()
    kwargs: dict[str, Any] = {
        "model": model or settings.openai_model,
        "messages": messages,
        "temperature": temperature if temperature is not None else settings.openai_temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    logger.debug("openai_request", model=kwargs["model"], json_mode=json_mode, n_messages=len(messages))

    try:
        response = await client.chat.completions.create(**kwargs)
    except Exception as exc:
        logger.error("openai_request_failed", error=str(exc))
        raise LLMError(f"OpenAI API call failed: {exc}") from exc

    content = response.choices[0].message.content or ""

    if json_mode:
        try:
            json.loads(content)
        except json.JSONDecodeError as exc:
            raise LLMError(f"OpenAI returned non-JSON response in JSON mode: {exc}") from exc

    logger.debug("openai_response_received", tokens=response.usage.total_tokens if response.usage else None)
    return content


async def chat_completion_json(
    messages: list[dict[str, str]],
    **kwargs: Any,
) -> dict[str, Any]:
    """Convenience wrapper that always uses JSON mode and parses the result."""
    raw = await chat_completion(messages, json_mode=True, **kwargs)
    return json.loads(raw)
