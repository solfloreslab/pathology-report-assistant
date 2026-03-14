# Architecture

## Pipeline Design

The agent follows a **sequential three-step pipeline**, where each step is an independent LLM call with a specialized system prompt:

```
Input (free text) → Classify → Extract → Validate → Output (structured JSON)
```

This is the **single-agent with tool-calling** pattern from the Mount Sinai taxonomy (Gorenshtein et al., 2025). Each "tool" is a separate prompt + protocol context injected at runtime.

## Step 1: Classify

- **Input:** Raw pathology report text
- **System prompt:** `src/prompts/classifier.md`
- **Output:** `ClassificationResult` (specimen type, organ, protocol ID, confidence 0–1)
- **Decision gate:** If confidence < 0.7, the pipeline falls back to a generic protocol and flags `needs_human_review = true`

The classifier maps the combination of specimen type + organ to one of 5 specific protocols or a generic fallback.

## Step 2: Extract

- **Input:** Report text + protocol-specific field definitions (injected from YAML)
- **System prompt:** `src/prompts/extractor_{protocol}.md` (5 specialized extractors)
- **Output:** Key-value pairs matching the protocol's required fields
- **Rule:** Extract ONLY explicitly stated information. Missing fields → `"not_reported"`

Each extractor prompt includes the full list of required fields from the protocol YAML, ensuring the LLM knows exactly what to look for.

## Step 3: Validate

- **Input:** Extracted key-value data + protocol fields + protocol rules
- **System prompt:** `src/prompts/validator.md`
- **Output:** `ValidationResult` (completeness score, missing fields with severity, inconsistencies)
- **Severity levels:**
  - `critical` — prevents staging or treatment decisions
  - `major` — required by protocol, impacts clinical management
  - `minor` — recommended but not blocking

## Protocol Registry

Protocols are defined in YAML files under `protocols/`. Each protocol specifies:

```yaml
protocol:
  id: colon-resection
  name: "Colon/Rectum Resection"
  version: "CAP 4.2.0.0 / ICCR 2020"

fields:
  - name: histologic_type
    severity: critical
    type: categorical
    description: "WHO classification histological type"
    values: ["adenocarcinoma", "mucinous", "signet ring", "medullary", "other"]

rules:
  - condition: "pT >= pT3"
    check: "lymph_nodes_examined must be reported"
    severity: critical
    message: "Lymph node evaluation mandatory for pT3+ tumors"
```

The `ProtocolRegistry` loads all YAMLs at startup and provides formatted field/rule text for prompt injection.

## LLM Client

The `LLMClient` abstracts two providers:

- **OpenRouter** (cloud): POST to `/v1/chat/completions` with Bearer token
- **Ollama** (local): POST to `/api/chat`

Features:
- **Retry with exponential backoff:** 3 attempts, delay = 2^n + random jitter (max 10s)
- **JSON repair:** Strips markdown fences, finds first `{`/last `}`, fixes trailing commas
- **Input sanitization:** Max 50,000 characters, control character stripping
- **Temperature 0.1:** Minimizes hallucination in structured extraction

## Schema Validation

All pipeline data flows through **Pydantic v2 models** (`src/schemas.py`):

- `ClassificationResult` — enforces `confidence: float` in [0.0, 1.0]
- `ValidationResult` — enforces severity enums, status enums
- `AuditTrail` — timestamps, model version, processing time
- `PipelineResult` — top-level container with all steps + `needs_human_review` flag

## Demo Architecture

```
Browser → Cloudflare Pages (static HTML)
                ↓ POST /api/analyze
         Cloudflare Worker (serverless)
                ↓ Bearer token
         OpenRouter API (LLM)
```

- API key stored as Worker secret (never in browser)
- Access code validated server-side
- Rate limiting: 10 requests/minute per IP
- Input validation: max 50K characters
