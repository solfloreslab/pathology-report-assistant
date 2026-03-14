"""Shared fixtures for the test suite."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from src.llm_client import LLMClient
from src.protocols import ProtocolRegistry

PROJECT_ROOT = Path(__file__).parent.parent


@pytest.fixture
def protocol_registry():
    """Load the real protocol registry."""
    return ProtocolRegistry(PROJECT_ROOT / "protocols")


@pytest.fixture
def sample_reports() -> dict[str, str]:
    """Load all sample reports as a dict of {filename: content}."""
    reports = {}
    for f in sorted((PROJECT_ROOT / "sample-reports").glob("*.txt")):
        reports[f.stem] = f.read_text(encoding="utf-8")
    return reports


@pytest.fixture
def expected_outputs() -> dict[str, dict]:
    """Load pre-computed output examples."""
    outputs = {}
    for f in sorted((PROJECT_ROOT / "output-examples").glob("*.json")):
        with open(f, encoding="utf-8") as fh:
            outputs[f.stem] = json.load(fh)
    return outputs


def make_mock_llm(responses: list[str]) -> LLMClient:
    """Create a mock LLMClient that returns pre-set responses in order."""
    client = MagicMock(spec=LLMClient)
    client.provider = "mock"
    client.model = "mock-model"

    call_count = {"n": 0}

    def mock_complete_json(system_prompt: str, user_content: str) -> dict:
        idx = call_count["n"]
        call_count["n"] += 1
        if idx < len(responses):
            raw = responses[idx]
            return json.loads(raw)
        raise RuntimeError(f"Mock LLM: no response prepared for call #{idx}")

    client.complete_json = mock_complete_json
    return client
