"""Pathology Report Structuring Agent — Pipeline orchestrator.

Usage:
    python -m src.agent <report_file> [--provider openrouter|ollama] [--model MODEL]
    python -m src.agent sample-reports/colon-adenocarcinoma-complete.txt
    python -m src.agent sample-reports/gastric-incomplete.txt --provider ollama --model qwen3:14b
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
import os

from src.llm_client import LLMClient, MAX_INPUT_SIZE
from src.protocols import ProtocolRegistry
from src.schemas import (
    AuditTrail,
    ClassificationResult,
    CopilotResult,
    PipelineResult,
    ProtocolId,
    ValidationResult,
)

logger = logging.getLogger(__name__)

# Confidence threshold — below this, use generic protocol + flag for human review
CONFIDENCE_THRESHOLD = 0.7

# Map protocol IDs to extractor prompt filenames
EXTRACTOR_PROMPTS = {
    ProtocolId.COLON_RESECTION: "extractor_colon.md",
    ProtocolId.BREAST_BIOPSY: "extractor_breast.md",
    ProtocolId.MELANOMA: "extractor_melanoma.md",
    ProtocolId.GASTRIC: "extractor_gastric.md",
    ProtocolId.CYTOLOGY_CERVICAL: "extractor_cytology.md",
}


class PathologyAgent:
    """Orchestrates the classify -> extract -> validate pipeline."""

    def __init__(
        self,
        llm_client: LLMClient,
        protocol_registry: ProtocolRegistry,
        prompts_dir: str | Path,
    ):
        self.llm = llm_client
        self.protocols = protocol_registry
        self.prompts_dir = Path(prompts_dir)

    def analyze(self, report_text: str) -> PipelineResult:
        """Run the full pipeline on a pathology report.

        Steps:
            1. Sanitize input
            2. Classify specimen type and select protocol
            3. Check confidence (gate at 0.7)
            4. Extract structured data using protocol-specific prompt
            5. Validate completeness against protocol
            6. Build audit trail
        """
        start_time = time.monotonic()

        # 1. Sanitize
        report_text = self._sanitize_input(report_text)

        # 2. Classify
        classification = self._classify(report_text)
        logger.info(
            f"Classification: {classification.organ_system.value} / "
            f"{classification.specimen_type.value} "
            f"(confidence: {classification.confidence:.2f})"
        )

        # 3. Confidence gate
        needs_human_review = False
        protocol_id = classification.protocol_to_apply
        if classification.confidence < CONFIDENCE_THRESHOLD:
            logger.warning(
                f"Low confidence ({classification.confidence:.2f}), "
                f"using generic protocol"
            )
            protocol_id = ProtocolId.GENERIC
            needs_human_review = True

        # 4. Extract
        extracted_data = self._extract(report_text, protocol_id)
        logger.info(f"Extracted {len(extracted_data)} fields")

        # 5. Validate
        validation = self._validate(extracted_data, protocol_id)
        logger.info(
            f"Validation: {validation.status.value} "
            f"({validation.completeness_score}%)"
        )

        # 6. Audit trail
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        audit_trail = AuditTrail(
            timestamp=datetime.now(timezone.utc),
            input_hash=hashlib.sha256(report_text.encode()).hexdigest(),
            classification_confidence=classification.confidence,
            protocol_used=protocol_id.value,
            completeness_score=validation.completeness_score,
            model_version=self.llm.model,
            provider=self.llm.provider,
            processing_time_ms=elapsed_ms,
        )

        return PipelineResult(
            classification=classification,
            extracted_data=extracted_data,
            validation=validation,
            audit_trail=audit_trail,
            needs_human_review=needs_human_review,
        )

    def expand(self, abbreviated_notes: str) -> CopilotResult:
        """Run the copilot pipeline: abbreviated notes -> draft report.

        Steps:
            1. Sanitize input
            2. Classify to select protocol
            3. Expand notes into full narrative + extracted fields
            4. Validate completeness
            5. Build audit trail
        """
        start_time = time.monotonic()

        # 1. Sanitize
        text = self._sanitize_input(abbreviated_notes)

        # 2. Classify
        classification = self._classify(text)
        logger.info(
            f"Classification: {classification.organ_system.value} / "
            f"{classification.protocol_to_apply.value} "
            f"(confidence: {classification.confidence:.2f})"
        )

        protocol_id = classification.protocol_to_apply
        if classification.confidence < CONFIDENCE_THRESHOLD:
            logger.warning(
                f"Low confidence ({classification.confidence:.2f}), "
                f"using generic protocol"
            )
            protocol_id = ProtocolId.GENERIC

        # 3. Expand
        if protocol_id == ProtocolId.GENERIC:
            # Can't expand without a specific protocol
            expanded = {
                "narrative": text,
                "extracted_fields": {},
            }
        else:
            expanded = self._expand(text, protocol_id)

        narrative = expanded.get("narrative", text)
        extracted_fields = expanded.get("extracted_fields", {})

        filled = [
            k for k, v in extracted_fields.items()
            if v is not None and v != "not_reported"
        ]
        pending = [
            k for k, v in extracted_fields.items()
            if v is None or v == "not_reported"
        ]

        logger.info(f"Expanded: {len(filled)} filled, {len(pending)} pending")

        # 4. Validate
        validation = self._validate(extracted_fields, protocol_id)
        logger.info(
            f"Validation: {validation.status.value} "
            f"({validation.completeness_score}%)"
        )

        # 5. Audit trail
        elapsed_ms = int((time.monotonic() - start_time) * 1000)
        audit_trail = AuditTrail(
            timestamp=datetime.now(timezone.utc),
            input_hash=hashlib.sha256(text.encode()).hexdigest(),
            classification_confidence=classification.confidence,
            protocol_used=protocol_id.value,
            completeness_score=validation.completeness_score,
            model_version=self.llm.model,
            provider=self.llm.provider,
            processing_time_ms=elapsed_ms,
        )

        return CopilotResult(
            classification=classification,
            expanded_report=narrative,
            filled_fields=filled,
            pending_fields=pending,
            validation=validation,
            audit_trail=audit_trail,
        )

    def _expand(
        self, abbreviated_text: str, protocol_id: ProtocolId
    ) -> dict[str, Any]:
        """Expand abbreviated notes into a full report using the expander prompt."""
        system_prompt = self._load_prompt("expander.md")

        try:
            fields_text = self.protocols.format_fields_for_prompt(protocol_id.value)
            system_prompt = system_prompt.replace("{PROTOCOL_FIELDS}", fields_text)
        except KeyError:
            logger.warning(f"Protocol {protocol_id.value} not found in registry")

        return self.llm.complete_json(system_prompt, abbreviated_text)

    def _sanitize_input(self, text: str) -> str:
        """Sanitize input: enforce max size, strip control characters."""
        # Strip control characters (keep newlines and tabs)
        text = "".join(
            c for c in text if c == "\n" or c == "\t" or (ord(c) >= 32)
        )
        # Enforce max size
        if len(text) > MAX_INPUT_SIZE:
            logger.warning(
                f"Input too long ({len(text)} chars), truncating to {MAX_INPUT_SIZE}"
            )
            text = text[:MAX_INPUT_SIZE]
        return text.strip()

    def _classify(self, report_text: str) -> ClassificationResult:
        """Step 1: Classify the report specimen type and select protocol."""
        system_prompt = self._load_prompt("classifier.md")
        result = self.llm.complete_json(system_prompt, report_text)
        return ClassificationResult(**result)

    def _extract(self, report_text: str, protocol_id: ProtocolId) -> dict[str, Any]:
        """Step 2: Extract structured data using protocol-specific prompt."""
        if protocol_id == ProtocolId.GENERIC:
            # For generic/unknown protocols, do a basic extraction
            return self._extract_generic(report_text)

        # Load protocol-specific extractor prompt
        prompt_file = EXTRACTOR_PROMPTS.get(protocol_id)
        if not prompt_file:
            logger.warning(f"No extractor prompt for {protocol_id}, using generic")
            return self._extract_generic(report_text)

        system_prompt = self._load_prompt(prompt_file)

        # Inject protocol fields into the prompt
        try:
            fields_text = self.protocols.format_fields_for_prompt(protocol_id.value)
            system_prompt = system_prompt.replace("{PROTOCOL_FIELDS}", fields_text)
        except KeyError:
            logger.warning(f"Protocol {protocol_id.value} not found in registry")

        return self.llm.complete_json(system_prompt, report_text)

    def _extract_generic(self, report_text: str) -> dict[str, Any]:
        """Fallback extraction for unknown report types."""
        system_prompt = (
            "You are a pathology report data extraction agent. "
            "Extract all clinically relevant structured data from the report. "
            "Respond ONLY with a JSON object. "
            "Include fields like: specimen_type, diagnosis, findings, "
            "recommendations, and any other relevant clinical data. "
            "If a field is not mentioned, use 'not_reported'."
        )
        return self.llm.complete_json(system_prompt, report_text)

    def _validate(
        self, extracted_data: dict[str, Any], protocol_id: ProtocolId
    ) -> ValidationResult:
        """Step 3: Validate extracted data against protocol requirements."""
        if protocol_id == ProtocolId.GENERIC:
            # Can't validate against a protocol we don't have
            return ValidationResult(
                completeness_score=0,
                total_required_fields=0,
                reported_fields=0,
                missing_fields=0,
                status="incomplete",
                quality_notes="Generic protocol — no structured validation available",
            )

        system_prompt = self._load_prompt("validator.md")

        # Inject protocol fields and rules
        try:
            fields_text = self.protocols.format_fields_for_prompt(protocol_id.value)
            rules_text = self.protocols.format_rules_for_prompt(protocol_id.value)
            system_prompt = system_prompt.replace("{PROTOCOL_FIELDS}", fields_text)
            system_prompt = system_prompt.replace("{PROTOCOL_RULES}", rules_text)
        except KeyError:
            logger.warning(f"Protocol {protocol_id.value} not found in registry")

        user_content = json.dumps(extracted_data, ensure_ascii=False, indent=2)
        result = self.llm.complete_json(system_prompt, user_content)
        return ValidationResult(**result)

    def _load_prompt(self, filename: str) -> str:
        """Load a prompt file from the prompts directory."""
        path = self.prompts_dir / filename
        return path.read_text(encoding="utf-8")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Pathology Report Structuring Agent"
    )
    parser.add_argument(
        "input",
        type=str,
        help="Path to report file (auditor) or abbreviated notes in quotes (copilot)",
    )
    parser.add_argument(
        "--mode",
        choices=["auditor", "copilot"],
        default="auditor",
        help="Pipeline mode (default: auditor)",
    )
    parser.add_argument(
        "--provider",
        choices=["openrouter", "ollama"],
        default="openrouter",
        help="LLM provider (default: openrouter)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Model name (default: from .env or provider default)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path (default: stdout)",
    )
    parser.add_argument(
        "--protocols-dir",
        type=str,
        default="protocols",
        help="Path to protocols directory (default: protocols/)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    # Load environment
    load_dotenv()

    # Read input
    if args.mode == "copilot":
        # Copilot: input can be a string or a file
        input_path = Path(args.input)
        if input_path.exists():
            report_text = input_path.read_text(encoding="utf-8")
        else:
            report_text = args.input
    else:
        # Auditor: input must be a file
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"Error: File not found: {input_path}", file=sys.stderr)
            sys.exit(1)
        report_text = input_path.read_text(encoding="utf-8")

    # Resolve provider settings
    provider = args.provider
    if provider == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            print(
                "Error: OPENROUTER_API_KEY not set. "
                "Copy .env.example to .env and add your key.",
                file=sys.stderr,
            )
            sys.exit(1)
        model = args.model or os.getenv("OPENROUTER_MODEL", "glm-4-plus")
        base_url = os.getenv("OPENROUTER_BASE_URL")
    else:  # ollama
        api_key = None
        model = args.model or os.getenv("OLLAMA_MODEL", "qwen3:14b")
        base_url = os.getenv("OLLAMA_BASE_URL")

    # Load protocols
    protocols_dir = Path(args.protocols_dir)
    if not protocols_dir.exists():
        print(f"Error: Protocols directory not found: {protocols_dir}", file=sys.stderr)
        sys.exit(1)
    protocol_registry = ProtocolRegistry(protocols_dir)

    # Run pipeline
    with LLMClient(
        provider=provider,
        model=model,
        api_key=api_key,
        base_url=base_url,
    ) as client:
        agent = PathologyAgent(
            llm_client=client,
            protocol_registry=protocol_registry,
            prompts_dir=Path("src/prompts"),
        )

        print(f"Mode: {args.mode}", file=sys.stderr)
        print(f"Provider: {provider} / Model: {model}", file=sys.stderr)

        if args.mode == "copilot":
            result = agent.expand(report_text)
        else:
            result = agent.analyze(report_text)

    # Output
    output_json = result.model_dump_json(indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output_json, encoding="utf-8")
        print(f"Output saved to: {output_path}", file=sys.stderr)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
