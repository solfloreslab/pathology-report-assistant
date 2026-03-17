# Scientific References

## Core Evidence

### LLM Performance in Pathology

1. **Grothey, A. et al.** (2025). Automated structuring of cancer pathology reports with large language models. *Communications Medicine*, 5(1), 48.
   - GPT-4: **98% accuracy** across 579 reports
   - Llama3 70B: **97% accuracy**
   - Evaluated on breast, colon, lung, prostate, and melanoma reports

2. **Strata, S. et al.** (2025). Fine-tuned open-source large language model for structured pathology data extraction. *Scientific Reports*, 15, 2927.
   - Llama-3.1 8B with LoRA fine-tuning
   - **90% exact match** (human-level performance)
   - Demonstrates viability of open-source models for on-premise deployment

3. **Chen, S. et al.** (2024). BB-TEN: Bidirectional biomedical TNM extraction. *Nature Communications*, 15, 9684.
   - AUROC **0.815–0.942** for T, N, M extraction
   - Tested on ~8,000 pathology reports across multiple cancer types
   - Validates TNM as a tractable NLP target

### Agentic AI in Medicine

4. **Gorenshtein, D. et al.** (2025). Agentic AI in medicine: a systematic review of design patterns and clinical applications. *medRxiv*.
   - Mount Sinai systematic review of 20 peer-reviewed studies
   - Agentic systems outperform base LLMs by median **+53 percentage points**
   - Minimum requirements: iterative reasoning (mandatory) + tool selection or multi-agent collaboration
   - Single-agent with tool-calling is the recommended starting pattern

5. **Hu, B. et al.** (2025). LLM-based agents for automating biomedical text extraction. *Frontiers in Medicine*, 12, 1530565.
   - Self-correction pattern: validator identifies inconsistencies for re-extraction
   - Structured output enforcement via JSON Schema reduces hallucination

## Protocol Standards

6. **College of American Pathologists (CAP)**. Cancer protocol templates.
   - Standardized checklists for 60+ cancer types
   - Define required vs. recommended fields with clinical rationale
   - [cap.org/protocols-and-guidelines](https://www.cap.org/protocols-and-guidelines)

7. **International Collaboration on Cancer Reporting (ICCR)**. Cancer reporting datasets.
   - International consensus on minimum dataset elements
   - Evidence-based field selection with grading of recommendation strength
   - [iccr-cancer.org](https://www.iccr-cancer.org/)

## Clinical Context

### The Narrative vs. Synoptic Gap

8. **SEAP (Sociedad Española de Anatomía Patológica)**. Quality improvement guidelines.
   - Narrative reports: **77% completeness** of required fields
   - Synoptic/structured reports: **98% completeness**
   - Standardized reporting improves downstream clinical decision-making

## Regulatory Framework

9. **EU AI Act** (Regulation 2024/1689).
    - Art. 6(3)(d): Preparatory task exemption
    - Art. 12: Audit trail requirements
    - Art. 14: Human oversight requirements
    - Art. 52: Transparency obligations

10. **MDCG 2019-11**. Guidance on qualification and classification of software in medical device regulatory framework.
    - Criteria for distinguishing medical device software from administrative tools

11. **GDPR** (Regulation 2016/679).
    - Art. 9(2)(h): Health data processing under professional responsibility
    - Art. 35: DPIA requirement for high-risk processing

