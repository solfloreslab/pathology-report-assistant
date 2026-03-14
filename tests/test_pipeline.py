"""Test full pipeline — end-to-end with mock LLM and audit trail."""

import json
from pathlib import Path

from src.agent import PathologyAgent
from src.protocols import ProtocolRegistry
from src.schemas import PipelineResult
from tests.conftest import make_mock_llm, PROJECT_ROOT


def test_pipeline_returns_complete_result(sample_reports):
    """Full pipeline should return a valid PipelineResult with all sections."""
    mock_classify = json.dumps({
        "specimen_type": "biopsy",
        "organ_system": "skin",
        "tumor_type_suspected": "Melanoma",
        "protocol_to_apply": "melanoma",
        "confidence": 0.95,
    })
    mock_extract = json.dumps({
        "histologic_type": "Melanoma de extension superficial",
        "breslow_thickness": 1.8,
        "ulceration": "present",
        "mitotic_index": "3 mitosis/mm2",
        "clark_level": "IV",
        "margins_lateral": "Libre (3 mm)",
        "margins_deep": "Libre (2 mm)",
        "lymphovascular_invasion": "not_identified",
        "neurotropism": "not_identified",
        "microsatellitosis": "not_identified",
        "pT_stage": "pT2b",
    })
    mock_validate = json.dumps({
        "completeness_score": 95,
        "total_required_fields": 11,
        "reported_fields": 11,
        "missing_fields": 0,
        "status": "complete",
        "missing_required": [],
        "inconsistencies": [],
        "quality_notes": "Complete melanoma report",
    })
    client = make_mock_llm([mock_classify, mock_extract, mock_validate])
    registry = ProtocolRegistry(PROJECT_ROOT / "protocols")
    agent = PathologyAgent(client, registry, PROJECT_ROOT / "src" / "prompts")

    result = agent.analyze(sample_reports["melanoma-superficial"])

    # Verify it's a valid PipelineResult
    assert isinstance(result, PipelineResult)
    assert result.classification is not None
    assert result.extracted_data is not None
    assert result.validation is not None
    assert result.needs_human_review is False


def test_audit_trail_has_required_fields(sample_reports):
    """Audit trail should contain timestamp, hash, model, provider, and timing."""
    mock_classify = json.dumps({
        "specimen_type": "cytology",
        "organ_system": "cervix",
        "tumor_type_suspected": "HSIL",
        "protocol_to_apply": "cytology-cervical",
        "confidence": 1.0,
    })
    mock_extract = json.dumps({
        "sample_type": "Citologia cervico-vaginal",
        "adequacy": "satisfactory",
        "bethesda_category": "HSIL",
    })
    mock_validate = json.dumps({
        "completeness_score": 80,
        "total_required_fields": 5,
        "reported_fields": 4,
        "missing_fields": 1,
        "status": "mostly_complete",
        "missing_required": [],
        "inconsistencies": [],
        "quality_notes": "OK",
    })
    client = make_mock_llm([mock_classify, mock_extract, mock_validate])
    registry = ProtocolRegistry(PROJECT_ROOT / "protocols")
    agent = PathologyAgent(client, registry, PROJECT_ROOT / "src" / "prompts")

    result = agent.analyze(sample_reports["cytology-cervical-hsil"])

    audit = result.audit_trail
    assert audit.timestamp is not None
    assert len(audit.input_hash) == 64  # SHA-256 hex
    assert audit.model_version == "mock-model"
    assert audit.provider == "mock"
    assert audit.processing_time_ms >= 0
    assert audit.protocol_used == "cytology-cervical"
