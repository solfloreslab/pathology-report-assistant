# Regulatory Positioning

## EU AI Act (Regulation 2024/1689)

### Classification: Not High-Risk

Under **Art. 6(3)(d)**, an AI system that performs a **preparatory task** for an action carried out by a human professional is exempt from high-risk classification, provided it does not replace the professional's judgment.

This agent:
- Structures information for subsequent review by a pathologist
- Does NOT make diagnostic or treatment decisions
- Does NOT autonomously generate pathology reports
- Requires human validation of all outputs

### Transparency (Art. 52)

The system clearly identifies itself as AI-powered in all interfaces. The demo includes a persistent disclaimer: "Not a medical device — for demonstration purposes only."

### Audit Trail (Art. 12)

Every pipeline execution generates a complete audit trail:
- Timestamp (ISO 8601)
- Protocol used and version
- Model version and provider
- Completeness score
- Processing time
- All classification/extraction/validation outputs preserved

### Human Oversight (Art. 14)

The system is designed for **human-in-the-loop** operation:
- `needs_human_review` flag when confidence < 0.7
- Missing field alerts with severity levels
- Inconsistency detection for clinician review
- No automated downstream actions

## Medical Device Regulation (EU MDR 2017/745)

### Not a Medical Device

Per **MDCG 2019-11** (Guidance on qualification and classification of software):

This software does NOT:
- Provide a diagnosis
- Suggest a specific treatment
- Calculate clinical risk scores used for patient management
- Interface with diagnostic equipment

It DOES:
- Extract structured data from existing clinical text
- Compare extracted data against protocol checklists
- Flag potential gaps for human review

This positions it as an **administrative/data structuring tool**, not a medical device.

## GDPR (Regulation 2016/679)

### Art. 9(2)(h): Health Data Processing

Processing of health data is permitted when carried out under the responsibility of a healthcare professional subject to professional secrecy obligations.

### Design for Compliance

- **On-premise capability:** Ollama provider enables fully local processing (no data leaves the institution)
- **No data persistence:** The agent processes and returns results without storing reports
- **Synthetic data only:** All development and testing uses entirely fictitious data
- **Input sanitization:** Control character stripping, size limits

### DPIA Requirement

A Data Protection Impact Assessment would be required before any deployment with real patient data (Art. 35).

## Spanish Regulatory Context

### Ley 41/2002 (Patient Autonomy)

Clinical documentation must maintain traceability. The audit trail satisfies documentation requirements for AI-assisted processes.

### eIASNS (November 2025)

The Spanish National Health System AI Strategy created the institutional framework for AI deployment in healthcare. This project aligns with its goals of:
- Standardizing clinical documentation
- Supporting clinical decision-making (not replacing it)
- Maintaining human oversight

### RedIA Salud

The €50M funding program for health AI projects validates the institutional demand for tools like this one.

## Summary

| Regulation | Status | Rationale |
|-----------|--------|-----------|
| EU AI Act | Preparatory task (Art. 6(3)(d)) | Structures data for human review |
| EU MDR | Not a medical device | No diagnosis, no treatment suggestion |
| GDPR | On-premise capable | Ollama provider, no data persistence |
| Ley 41/2002 | Audit trail compliant | Full traceability of AI-assisted process |
