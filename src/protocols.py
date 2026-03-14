"""Protocol registry — loads YAML protocol definitions."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class FieldDef(BaseModel):
    """Definition of a single protocol field."""

    name: str
    severity: str  # required, recommended
    type: str
    description: str = ""
    values: list[str | int] | None = None
    reference: str | None = None
    unit: str | None = None
    minimum: int | None = None


class Rule(BaseModel):
    """A validation rule from the protocol."""

    condition: str
    check: str = ""
    severity: str
    message: str = ""


class Protocol(BaseModel):
    """A complete CAP/ICCR-based protocol definition."""

    id: str
    name: str
    version: str
    organ: str
    specimen_types: list[str]
    fields: list[FieldDef] = Field(default_factory=list)
    rules: list[Rule] = Field(default_factory=list)


class ProtocolRegistry:
    """Loads and provides access to YAML protocol definitions."""

    def __init__(self, protocols_dir: str | Path):
        self._protocols: dict[str, Protocol] = {}
        self._load_all(Path(protocols_dir))

    def _load_all(self, protocols_dir: Path) -> None:
        for yaml_file in sorted(protocols_dir.glob("*.yaml")):
            self._load_one(yaml_file)

    def _load_one(self, path: Path) -> None:
        with open(path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f)

        proto_data = raw.get("protocol", {})
        fields_data = raw.get("fields", [])
        rules_data = raw.get("rules", [])

        fields = [FieldDef(**fd) for fd in fields_data]
        rules = [Rule(**rd) for rd in rules_data]

        protocol = Protocol(
            id=proto_data["id"],
            name=proto_data["name"],
            version=proto_data["version"],
            organ=proto_data["organ"],
            specimen_types=proto_data.get("specimen_types", []),
            fields=fields,
            rules=rules,
        )
        self._protocols[protocol.id] = protocol

    def get(self, protocol_id: str) -> Protocol:
        """Get a protocol by ID. Raises KeyError if not found."""
        if protocol_id not in self._protocols:
            available = ", ".join(sorted(self._protocols.keys()))
            raise KeyError(
                f"Protocol '{protocol_id}' not found. Available: {available}"
            )
        return self._protocols[protocol_id]

    def get_required_fields(self, protocol_id: str) -> list[FieldDef]:
        """Get only the required fields for a protocol."""
        protocol = self.get(protocol_id)
        return [f for f in protocol.fields if f.severity == "required"]

    def get_recommended_fields(self, protocol_id: str) -> list[FieldDef]:
        """Get only the recommended fields for a protocol."""
        protocol = self.get(protocol_id)
        return [f for f in protocol.fields if f.severity == "recommended"]

    def get_rules(self, protocol_id: str) -> list[Rule]:
        """Get validation rules for a protocol."""
        return self.get(protocol_id).rules

    def list_protocols(self) -> list[str]:
        """List all available protocol IDs."""
        return sorted(self._protocols.keys())

    def format_fields_for_prompt(self, protocol_id: str) -> str:
        """Format protocol fields as text for LLM prompt injection."""
        protocol = self.get(protocol_id)
        lines = []
        for f in protocol.fields:
            severity_tag = f.severity.upper()
            desc = f" — {f.description}" if f.description else ""
            values = f" (values: {', '.join(str(v) for v in f.values)})" if f.values else ""
            lines.append(f"- [{severity_tag}] {f.name}: {f.type}{values}{desc}")
        return "\n".join(lines)

    def format_rules_for_prompt(self, protocol_id: str) -> str:
        """Format protocol rules as text for LLM prompt injection."""
        rules = self.get_rules(protocol_id)
        lines = []
        for r in rules:
            lines.append(f"- IF {r.condition} THEN {r.message} [{r.severity}]")
        return "\n".join(lines)
