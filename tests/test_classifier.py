"""Test classifier step — correct mapping and low confidence handling."""

import json
from pathlib import Path

from src.agent import PathologyAgent
from src.protocols import ProtocolRegistry
from tests.conftest import make_mock_llm, PROJECT_ROOT


def test_colon_maps_to_colon_resection(sample_reports):
    """Colon adenocarcinoma report should classify as colon-resection."""
    mock_response = json.dumps({
        "specimen_type": "resection",
        "organ_system": "colon",
        "tumor_type_suspected": "Adenocarcinoma de colon",
        "protocol_to_apply": "colon-resection",
        "confidence": 0.98,
    })
    # Mock: classify, extract, validate
    mock_extract = json.dumps({"procedure_type": "Hemicolectomia", "pTNM": "pT3 N1a M0"})
    mock_validate = json.dumps({
        "completeness_score": 90, "total_required_fields": 14,
        "reported_fields": 13, "missing_fields": 1,
        "status": "complete", "missing_required": [], "inconsistencies": [],
        "quality_notes": "Good",
    })
    client = make_mock_llm([mock_response, mock_extract, mock_validate])
    registry = ProtocolRegistry(PROJECT_ROOT / "protocols")
    agent = PathologyAgent(client, registry, PROJECT_ROOT / "src" / "prompts")

    result = agent.analyze(sample_reports["colon-adenocarcinoma-complete"])
    assert result.classification.protocol_to_apply.value == "colon-resection"
    assert result.classification.confidence >= 0.9


def test_low_confidence_triggers_human_review():
    """Low confidence classification should flag human review."""
    mock_classify = json.dumps({
        "specimen_type": "other",
        "organ_system": "other",
        "tumor_type_suspected": "unclear",
        "protocol_to_apply": "generic",
        "confidence": 0.3,
    })
    mock_extract = json.dumps({"specimen_type": "unknown", "findings": "unclear"})
    # Generic protocol returns a basic validation
    client = make_mock_llm([mock_classify, mock_extract])
    registry = ProtocolRegistry(PROJECT_ROOT / "protocols")
    agent = PathologyAgent(client, registry, PROJECT_ROOT / "src" / "prompts")

    result = agent.analyze("Some random text that is not a pathology report.")
    assert result.needs_human_review is True
    assert result.classification.confidence < 0.7
