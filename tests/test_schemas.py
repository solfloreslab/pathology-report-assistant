"""Test Pydantic schemas — validation and rejection."""

import pytest
from pydantic import ValidationError

from src.schemas import (
    ClassificationResult,
    PipelineResult,
    SpecimenType,
    OrganSystem,
    ProtocolId,
)


def test_classification_result_valid():
    """Valid classification data should parse correctly."""
    result = ClassificationResult(
        specimen_type="resection",
        organ_system="colon",
        tumor_type_suspected="Adenocarcinoma",
        protocol_to_apply="colon-resection",
        confidence=0.95,
    )
    assert result.specimen_type == SpecimenType.RESECTION
    assert result.organ_system == OrganSystem.COLON
    assert result.protocol_to_apply == ProtocolId.COLON_RESECTION
    assert result.confidence == 0.95


def test_classification_result_rejects_invalid():
    """Invalid data should raise ValidationError."""
    # Confidence > 1.0
    with pytest.raises(ValidationError):
        ClassificationResult(
            specimen_type="resection",
            organ_system="colon",
            tumor_type_suspected="test",
            protocol_to_apply="colon-resection",
            confidence=1.5,
        )

    # Unknown specimen type
    with pytest.raises(ValidationError):
        ClassificationResult(
            specimen_type="invalid_type",
            organ_system="colon",
            tumor_type_suspected="test",
            protocol_to_apply="colon-resection",
            confidence=0.5,
        )
