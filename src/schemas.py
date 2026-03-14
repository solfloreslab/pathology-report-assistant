"""Pydantic v2 models for the pathology report structuring pipeline."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SpecimenType(str, Enum):
    RESECTION = "resection"
    BIOPSY = "biopsy"
    CYTOLOGY = "cytology"
    FNAB = "fnab"
    CONSULTATION = "consultation"
    OTHER = "other"


class OrganSystem(str, Enum):
    COLON = "colon"
    BREAST = "breast"
    SKIN = "skin"
    GASTRIC = "gastric"
    CERVIX = "cervix"
    PROSTATE = "prostate"
    LUNG = "lung"
    OTHER = "other"


class ProtocolId(str, Enum):
    COLON_RESECTION = "colon-resection"
    BREAST_BIOPSY = "breast-biopsy"
    MELANOMA = "melanoma"
    GASTRIC = "gastric"
    CYTOLOGY_CERVICAL = "cytology-cervical"
    GENERIC = "generic"


class Severity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"


class ValidationStatus(str, Enum):
    COMPLETE = "complete"
    MOSTLY_COMPLETE = "mostly_complete"
    INCOMPLETE = "incomplete"
    CRITICALLY_INCOMPLETE = "critically_incomplete"


# --- Classification ---

class ClassificationResult(BaseModel):
    """Result of the specimen classification step."""

    specimen_type: SpecimenType
    organ_system: OrganSystem
    tumor_type_suspected: str = Field(
        description="Brief description of suspected tumor type"
    )
    protocol_to_apply: ProtocolId
    confidence: float = Field(ge=0.0, le=1.0)


# --- Validation ---

class MissingField(BaseModel):
    """A required field that is missing from the report."""

    field: str
    severity: Severity
    recommendation: str = ""


class Inconsistency(BaseModel):
    """An inconsistency found in the extracted data."""

    finding: str
    severity: str = Field(description="warning or error")


class ValidationResult(BaseModel):
    """Result of the completeness validation step."""

    completeness_score: int = Field(ge=0, le=100)
    total_required_fields: int = Field(ge=0)
    reported_fields: int = Field(ge=0)
    missing_fields: int = Field(ge=0)
    status: ValidationStatus
    missing_required: list[MissingField] = Field(default_factory=list)
    inconsistencies: list[Inconsistency] = Field(default_factory=list)
    quality_notes: str = ""


# --- Audit Trail ---

class AuditTrail(BaseModel):
    """Metadata for traceability and compliance (EU AI Act Art. 12)."""

    timestamp: datetime
    input_hash: str = Field(description="SHA-256 hash of the input report text")
    classification_confidence: float = Field(ge=0.0, le=1.0)
    protocol_used: str
    completeness_score: int = Field(ge=0, le=100)
    model_version: str
    provider: str
    processing_time_ms: int = Field(ge=0)
    pipeline_version: str = "0.1.0"


# --- Pipeline Result ---

class PipelineResult(BaseModel):
    """Combined output of the full classify -> extract -> validate pipeline."""

    classification: ClassificationResult
    extracted_data: dict[str, Any] = Field(
        description="Structured data extracted from the report"
    )
    validation: ValidationResult
    audit_trail: AuditTrail
    needs_human_review: bool = Field(
        default=False,
        description="True when classifier confidence < 0.7"
    )
