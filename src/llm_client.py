"""LLM client abstraction with retry logic and JSON repair."""

from __future__ import annotations

import json
import logging
import re
import time
import random
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# Maximum input size (characters)
MAX_INPUT_SIZE = 50_000


class LLMError(Exception):
    """Base error for LLM operations."""


class LLMTimeoutError(LLMError):
    """LLM call timed out after all retries."""


class LLMResponseError(LLMError):
    """LLM returned an unexpected response."""


class JSONRepairError(LLMError):
    """Could not parse or repair JSON from LLM output."""


def _repair_json(text: str) -> dict[str, Any]:
    """Attempt to extract and repair JSON from LLM output.

    Handles common issues:
    - Markdown code fences (```json ... ```)
    - Text before/after the JSON object
    - Trailing commas
    """
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text)
    text = text.strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find the first { and last } to extract the JSON object
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        candidate = text[first_brace : last_brace + 1]

        # Fix trailing commas before } or ]
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)

        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    raise JSONRepairError(f"Could not parse JSON from LLM output: {text[:200]}...")


class LLMClient:
    """Synchronous LLM client supporting OpenRouter and Ollama providers."""

    def __init__(
        self,
        provider: str = "openrouter",
        model: str = "glm-4-plus",
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
    ):
        self.provider = provider
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

        if provider == "openrouter":
            self.base_url = base_url or "https://openrouter.ai/api/v1"
            if not self.api_key:
                raise LLMError("OpenRouter requires an API key")
        elif provider == "ollama":
            self.base_url = base_url or "http://localhost:11434"
        else:
            raise LLMError(f"Unknown provider: {provider}")

        self._client = httpx.Client(timeout=self.timeout)

    def complete(self, system_prompt: str, user_content: str) -> str:
        """Send a chat completion request and return the raw text response."""
        return self._call_with_retry(system_prompt, user_content)

    def complete_json(self, system_prompt: str, user_content: str) -> dict[str, Any]:
        """Send a chat completion request and return parsed JSON.

        Includes automatic JSON repair for common LLM output issues.
        """
        raw = self._call_with_retry(system_prompt, user_content)
        return _repair_json(raw)

    def _call_with_retry(
        self,
        system_prompt: str,
        user_content: str,
        max_retries: int = 3,
        base_delay: float = 1.0,
    ) -> str:
        """Call LLM with exponential backoff + jitter on failure."""
        last_error: Exception | None = None

        for attempt in range(max_retries):
            try:
                return self._do_call(system_prompt, user_content)
            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code == 429:
                    # Rate limited — back off
                    delay = min(base_delay * (2**attempt) + random.uniform(0, 1), 10)
                    logger.warning(
                        f"Rate limited (429), retry {attempt + 1}/{max_retries} "
                        f"in {delay:.1f}s"
                    )
                    time.sleep(delay)
                elif e.response.status_code >= 500:
                    # Server error — retry
                    delay = min(base_delay * (2**attempt) + random.uniform(0, 1), 10)
                    logger.warning(
                        f"Server error ({e.response.status_code}), retry "
                        f"{attempt + 1}/{max_retries} in {delay:.1f}s"
                    )
                    time.sleep(delay)
                else:
                    # Client error (4xx other than 429) — don't retry
                    raise LLMResponseError(
                        f"API error {e.response.status_code}: {e.response.text[:500]}"
                    ) from e
            except httpx.TimeoutException as e:
                last_error = e
                delay = min(base_delay * (2**attempt) + random.uniform(0, 1), 10)
                logger.warning(
                    f"Timeout, retry {attempt + 1}/{max_retries} in {delay:.1f}s"
                )
                time.sleep(delay)
            except httpx.ConnectError as e:
                last_error = e
                if self.provider == "ollama":
                    raise LLMError(
                        f"Cannot connect to Ollama at {self.base_url}. "
                        "Is Ollama running?"
                    ) from e
                raise LLMError(f"Connection error: {e}") from e

        raise LLMTimeoutError(
            f"LLM call failed after {max_retries} attempts"
        ) from last_error

    def _do_call(self, system_prompt: str, user_content: str) -> str:
        """Execute a single LLM API call."""
        if self.provider == "openrouter":
            return self._call_openrouter(system_prompt, user_content)
        elif self.provider == "ollama":
            return self._call_ollama(system_prompt, user_content)
        else:
            raise LLMError(f"Unknown provider: {self.provider}")

    def _call_openrouter(self, system_prompt: str, user_content: str) -> str:
        """Call OpenRouter API (OpenAI-compatible)."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.1,  # Low temperature for structured extraction
        }

        response = self._client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def _call_ollama(self, system_prompt: str, user_content: str) -> str:
        """Call Ollama API."""
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "stream": False,
            "options": {
                "temperature": 0.1,
            },
        }

        response = self._client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()
