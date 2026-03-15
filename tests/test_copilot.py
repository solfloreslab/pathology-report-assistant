"""Tests for the copilot mode (abbreviated notes -> draft report)."""

from __future__ import annotations

import json

from src.agent import PathologyAgent
from src.schemas import CopilotResult
from tests.conftest import make_mock_llm


# Mock responses for copilot pipeline: classify -> expand -> validate
MOCK_CLASSIFY = json.dumps({
    "specimen_type": "resection",
    "organ_system": "colon",
    "tumor_type_suspected": "Adenocarcinoma de colon",
    "protocol_to_apply": "colon-resection",
    "confidence": 0.95,
})

MOCK_EXPAND = json.dumps({
    "narrative": (
        "DESCRIPCIÓN MICROSCÓPICA:\n"
        "Adenocarcinoma de colon sigmoide, tipo intestinal, "
        "moderadamente diferenciado (G2). "
        "Sin invasión perineural. "
        "De los 18 ganglios linfáticos aislados, 2 presentan metástasis (2/18). "
        "Margen de resección distal libre a 3 cm.\n\n"
        "[PENDIENTE: Profundidad de invasión]\n"
        "[PENDIENTE: Invasión linfovascular]\n"
        "[PENDIENTE: MMR/MSI]\n\n"
        "DIAGNÓSTICO:\n"
        "Adenocarcinoma de colon sigmoide, moderadamente diferenciado (G2). "
        "[PENDIENTE: Estadificación pTNM]"
    ),
    "extracted_fields": {
        "procedure_type": "sigmoidectomía",
        "tumor_location": "colon sigmoide",
        "histologic_type": "adenocarcinoma, tipo intestinal",
        "histologic_grade": "G2, moderadamente diferenciado",
        "depth_of_invasion": None,
        "pTNM": None,
        "lymph_nodes_examined": 18,
        "lymph_nodes_positive": 2,
        "margins_proximal": "not_reported",
        "margins_distal": "libre, 3 cm",
        "margins_radial": "not_reported",
        "lymphovascular_invasion": None,
        "perineural_invasion": "absent",
        "mmr_msi": None,
        "tumor_size": "not_reported",
        "tumor_perforation": "not_reported",
        "extranodal_extension": "not_reported",
        "tumor_deposits": "not_reported",
        "associated_findings": "not_reported",
    },
})

MOCK_VALIDATE = json.dumps({
    "completeness_score": 42,
    "total_required_fields": 14,
    "reported_fields": 6,
    "missing_fields": 8,
    "status": "incomplete",
    "missing_required": [
        {"field": "depth_of_invasion", "severity": "critical", "recommendation": "Especificar profundidad"},
        {"field": "pTNM", "severity": "critical", "recommendation": "Estadificación patológica"},
        {"field": "lymphovascular_invasion", "severity": "major", "recommendation": "Reportar ILV"},
        {"field": "mmr_msi", "severity": "major", "recommendation": "Obligatorio en colorrectal"},
    ],
    "inconsistencies": [],
    "quality_notes": "Borrador copiloto — campos pendientes requieren completar",
})


def test_copilot_returns_copilot_result(protocol_registry):
    """Copilot pipeline produces a valid CopilotResult."""
    mock_llm = make_mock_llm([MOCK_CLASSIFY, MOCK_EXPAND, MOCK_VALIDATE])
    agent = PathologyAgent(mock_llm, protocol_registry, "src/prompts")

    result = agent.expand("sigmoide adeno mod G2 s/perineural 2/18 gang marg 3cm")

    assert isinstance(result, CopilotResult)
    assert result.source_mode == "copilot"
    assert "[PENDIENTE" in result.expanded_report
    assert "adenocarcinoma" in result.expanded_report.lower()


def test_copilot_tracks_filled_and_pending(protocol_registry):
    """Copilot correctly separates filled vs pending fields."""
    mock_llm = make_mock_llm([MOCK_CLASSIFY, MOCK_EXPAND, MOCK_VALIDATE])
    agent = PathologyAgent(mock_llm, protocol_registry, "src/prompts")

    result = agent.expand("sigmoide adeno mod G2 s/perineural 2/18 gang marg 3cm")

    assert "histologic_type" in result.filled_fields
    assert "perineural_invasion" in result.filled_fields
    assert "lymph_nodes_examined" in result.filled_fields
    assert "pTNM" in result.pending_fields
    assert "mmr_msi" in result.pending_fields
    assert "depth_of_invasion" in result.pending_fields


def test_copilot_audit_trail(protocol_registry):
    """Copilot audit trail has all required fields."""
    mock_llm = make_mock_llm([MOCK_CLASSIFY, MOCK_EXPAND, MOCK_VALIDATE])
    agent = PathologyAgent(mock_llm, protocol_registry, "src/prompts")

    result = agent.expand("mama CDI G2 RE+ RP+ HER2 1+")

    assert result.audit_trail.provider == "mock"
    assert result.audit_trail.protocol_used != ""
    assert result.audit_trail.processing_time_ms >= 0
    assert result.audit_trail.input_hash != ""
