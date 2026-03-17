/**
 * Pathology Report Structuring Agent — Cloudflare Worker
 *
 * POST /api/analyze  { mode: "copilot"|"auditor", report_text: "...", access_code: "..." }
 *
 * Modes:
 *   copilot — abbreviated notes → draft report + validation
 *   auditor — full report → extraction + validation (default)
 *
 * API key lives in Worker env secret OPENROUTER_API_KEY — never exposed to browser.
 * Access code lives in Worker env secret ACCESS_CODE — validated server-side.
 */

// --- Rate limiting (in-memory, resets on cold start) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_REPORT_SIZE = 50_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || [];
  const recent = entry.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// --- Protocol definitions (from YAML, embedded for Worker) ---
const PROTOCOLS = {
  "colon-resection": {
    fields: [
      "procedure_type", "tumor_location", "histologic_type", "histologic_grade",
      "depth_of_invasion", "pTNM", "lymph_nodes_examined", "lymph_nodes_positive",
      "margins_proximal", "margins_distal", "margins_radial",
      "lymphovascular_invasion", "perineural_invasion", "mmr_msi",
      "tumor_size", "tumor_perforation", "extranodal_extension", "tumor_deposits", "associated_findings",
    ],
    labels_es: {
      procedure_type: "Tipo de procedimiento", tumor_location: "Localización del tumor",
      histologic_type: "Tipo histológico", histologic_grade: "Grado histológico",
      depth_of_invasion: "Profundidad de invasión", pTNM: "Estadificación pTNM",
      lymph_nodes_examined: "Ganglios examinados", lymph_nodes_positive: "Ganglios positivos",
      margins_proximal: "Margen proximal", margins_distal: "Margen distal",
      margins_radial: "Margen radial", lymphovascular_invasion: "Invasión linfovascular",
      perineural_invasion: "Invasión perineural", mmr_msi: "MMR/MSI",
      tumor_size: "Tamaño tumoral", tumor_perforation: "Perforación tumoral",
      extranodal_extension: "Extensión extranodal", tumor_deposits: "Depósitos tumorales",
      associated_findings: "Hallazgos asociados",
    },
    labels_en: {
      procedure_type: "Procedure type", tumor_location: "Tumor location",
      histologic_type: "Histologic type", histologic_grade: "Histologic grade",
      depth_of_invasion: "Depth of invasion", pTNM: "pTNM staging",
      lymph_nodes_examined: "Lymph nodes examined", lymph_nodes_positive: "Lymph nodes positive",
      margins_proximal: "Proximal margin", margins_distal: "Distal margin",
      margins_radial: "Radial margin", lymphovascular_invasion: "Lymphovascular invasion",
      perineural_invasion: "Perineural invasion", mmr_msi: "MMR/MSI status",
      tumor_size: "Tumor size", tumor_perforation: "Tumor perforation",
      extranodal_extension: "Extranodal extension", tumor_deposits: "Tumor deposits",
      associated_findings: "Associated findings",
    },
    rules: [
      "IF pT >= pT3 THEN lymph_nodes_examined must be reported [critical]",
      "IF lymph_nodes_examined < 12 THEN Below recommended minimum [warning]",
      "IF always THEN mmr_msi must be reported [required]",
    ],
  },
  "breast-biopsy": {
    fields: [
      "histologic_type", "histologic_grade", "tubule_formation", "nuclear_pleomorphism",
      "mitotic_count", "estrogen_receptor", "progesterone_receptor", "her2_status",
      "ki67", "in_situ_component", "molecular_subtype", "tumor_size",
    ],
    labels_es: {
      histologic_type: "Tipo histológico", histologic_grade: "Grado histológico (Nottingham)",
      tubule_formation: "Formación tubular", nuclear_pleomorphism: "Pleomorfismo nuclear",
      mitotic_count: "Índice mitótico", estrogen_receptor: "Receptores de estrógeno (RE)",
      progesterone_receptor: "Receptores de progesterona (RP)", her2_status: "HER2",
      ki67: "Ki-67", in_situ_component: "Componente in situ",
      molecular_subtype: "Subtipo molecular", tumor_size: "Tamaño tumoral",
    },
    labels_en: {
      histologic_type: "Histologic type", histologic_grade: "Histologic grade (Nottingham)",
      tubule_formation: "Tubule formation", nuclear_pleomorphism: "Nuclear pleomorphism",
      mitotic_count: "Mitotic count", estrogen_receptor: "Estrogen receptor (ER)",
      progesterone_receptor: "Progesterone receptor (PR)", her2_status: "HER2 status",
      ki67: "Ki-67", in_situ_component: "In situ component",
      molecular_subtype: "Molecular subtype", tumor_size: "Tumor size",
    },
    rules: [
      "IF always THEN estrogen_receptor must be reported [required]",
      "IF always THEN progesterone_receptor must be reported [required]",
      "IF always THEN her2_status must be reported [required]",
      "IF always THEN ki67 must be reported [required]",
      "IF her2_status == '2+' THEN FISH/SISH must be reported [warning]",
    ],
  },
  melanoma: {
    fields: [
      "histologic_type", "breslow_thickness", "ulceration", "mitotic_index",
      "clark_level", "margins_lateral", "margins_deep", "lymphovascular_invasion",
      "neurotropism", "microsatellitosis", "pT_stage",
      "regression", "til_status", "growth_phase",
    ],
    labels_es: {
      histologic_type: "Tipo histológico", breslow_thickness: "Espesor de Breslow",
      ulceration: "Ulceración", mitotic_index: "Índice mitótico",
      clark_level: "Nivel de Clark", margins_lateral: "Margen lateral",
      margins_deep: "Margen profundo", lymphovascular_invasion: "Invasión linfovascular",
      neurotropism: "Neurotropismo", microsatellitosis: "Satelitosis microscópica",
      pT_stage: "Estadio pT", regression: "Regresión",
      til_status: "Infiltrado linfocitario (TILs)", growth_phase: "Fase de crecimiento",
    },
    labels_en: {
      histologic_type: "Histologic type", breslow_thickness: "Breslow thickness",
      ulceration: "Ulceration", mitotic_index: "Mitotic index",
      clark_level: "Clark level", margins_lateral: "Lateral margin",
      margins_deep: "Deep margin", lymphovascular_invasion: "Lymphovascular invasion",
      neurotropism: "Neurotropism", microsatellitosis: "Microsatellitosis",
      pT_stage: "pT stage", regression: "Regression",
      til_status: "TIL status", growth_phase: "Growth phase",
    },
    rules: [
      "IF breslow_thickness is missing THEN critical error [critical]",
      "IF breslow_thickness > 1.0 and ulceration is missing THEN warning [warning]",
      "IF margins < 1mm THEN consider re-excision [warning]",
      "IF pT_stage >= pT2b THEN recommend sentinel lymph node [warning]",
    ],
  },
  gastric: {
    fields: [
      "histologic_type", "histologic_grade", "tumor_location", "depth_of_invasion",
      "pT_stage", "pN_stage", "lymph_nodes_examined", "lymph_nodes_positive",
      "margins_proximal", "margins_distal", "lymphovascular_invasion",
      "perineural_invasion", "her2_status",
      "tumor_size", "extranodal_extension", "pdl1_cps", "msi_mmr",
    ],
    labels_es: {
      histologic_type: "Tipo histológico", histologic_grade: "Grado histológico",
      tumor_location: "Localización del tumor", depth_of_invasion: "Profundidad de invasión",
      pT_stage: "Estadio pT", pN_stage: "Estadio pN",
      lymph_nodes_examined: "Ganglios examinados", lymph_nodes_positive: "Ganglios positivos",
      margins_proximal: "Margen proximal", margins_distal: "Margen distal",
      lymphovascular_invasion: "Invasión linfovascular", perineural_invasion: "Invasión perineural",
      her2_status: "HER2", tumor_size: "Tamaño tumoral",
      extranodal_extension: "Extensión extranodal", pdl1_cps: "PD-L1 CPS",
      msi_mmr: "MSI/MMR",
    },
    labels_en: {
      histologic_type: "Histologic type", histologic_grade: "Histologic grade",
      tumor_location: "Tumor location", depth_of_invasion: "Depth of invasion",
      pT_stage: "pT stage", pN_stage: "pN stage",
      lymph_nodes_examined: "Lymph nodes examined", lymph_nodes_positive: "Lymph nodes positive",
      margins_proximal: "Proximal margin", margins_distal: "Distal margin",
      lymphovascular_invasion: "Lymphovascular invasion", perineural_invasion: "Perineural invasion",
      her2_status: "HER2 status", tumor_size: "Tumor size",
      extranodal_extension: "Extranodal extension", pdl1_cps: "PD-L1 CPS",
      msi_mmr: "MSI/MMR status",
    },
    rules: [
      "IF lymph_nodes_examined is missing THEN error [critical]",
      "IF lymph_nodes_examined < 16 THEN below recommended minimum [warning]",
      "IF diffuse type and grade is missing THEN G3 by definition [warning]",
      "IF pT >= pT3 and HER2 is missing THEN required per NCCN/ESMO [warning]",
      "IF pT_stage is missing THEN prevents staging [critical]",
    ],
  },
  "cytology-cervical": {
    fields: [
      "sample_type", "adequacy", "endocervical_component", "bethesda_category",
      "organisms", "cytologic_description", "recommendations", "hpv_correlation",
    ],
    labels_es: {
      sample_type: "Tipo de muestra", adequacy: "Idoneidad de la muestra",
      endocervical_component: "Componente endocervical", bethesda_category: "Categoría Bethesda",
      organisms: "Organismos", cytologic_description: "Descripción citológica",
      recommendations: "Recomendaciones", hpv_correlation: "Correlación VPH",
    },
    labels_en: {
      sample_type: "Sample type", adequacy: "Sample adequacy",
      endocervical_component: "Endocervical component", bethesda_category: "Bethesda category",
      organisms: "Organisms", cytologic_description: "Cytologic description",
      recommendations: "Recommendations", hpv_correlation: "HPV correlation",
    },
    rules: [
      "IF bethesda_category is missing THEN no standardized diagnosis [critical]",
      "IF adequacy == unsatisfactory THEN no diagnosis should be issued [warning]",
      "IF ASC-H or higher THEN colposcopy recommendation expected [warning]",
      "IF AGC THEN specify origin [warning]",
    ],
  },
};

// --- Prompts ---
const CLASSIFIER_PROMPT = `You are a pathology report classifier agent.
Analyze the input and classify it. The input may be a full report OR abbreviated clinical notes.
Respond ONLY with a JSON object — no explanation, no markdown, no extra text.
Output schema:
{"specimen_type":"resection"|"biopsy"|"cytology"|"fnab"|"other","organ_system":"colon"|"breast"|"skin"|"gastric"|"cervix"|"other","tumor_type_suspected":"description","protocol_to_apply":"colon-resection"|"breast-biopsy"|"melanoma"|"gastric"|"cytology-cervical"|"generic","confidence":0.0-1.0}
Rules:
- Colon/rectum + resection → colon-resection
- Breast + biopsy/BAG → breast-biopsy
- Skin + melanoma → melanoma
- Gastric + resection → gastric
- Cervix + cytology → cytology-cervical
- Anything else → generic
- If ambiguous, confidence below 0.7.
- ONLY the JSON object.`;

const EXTRACTOR_PROMPT_TEMPLATE = `You are a specialized data extraction agent for pathology reports.
Extract all structured data following the protocol fields below.
Respond ONLY with a JSON object — no explanation, no markdown, no extra text.
Rules:
- Extract ONLY information explicitly stated in the report.
- NEVER invent or infer data not in the report.
- If a field is not mentioned, use "not_reported".
--- REQUIRED FIELDS ---
{FIELDS}`;

const EXPANDER_PROMPT_TEMPLATE = `You are a pathology report drafting assistant. You receive abbreviated clinical notes written by a pathologist and a list of protocol-required fields.

Your task: expand the abbreviated notes into a complete, formal pathology report narrative in Spanish medical language, following CAP/ICCR structure.

CRITICAL RULES:
1. ONLY use information explicitly present in the abbreviated notes. NEVER invent, assume, or infer findings not stated.
2. For every protocol field NOT mentioned in the notes, insert the marker [PENDIENTE: field_description] in the narrative where that information would normally appear.
3. Use formal Spanish medical terminology.
4. Structure the report with standard pathology sections: DESCRIPCIÓN MACROSCÓPICA (if data available), DESCRIPCIÓN MICROSCÓPICA, DIAGNÓSTICO, and additional sections as needed.
5. Expand common pathology abbreviations: "adeno" = adenocarcinoma, "mod" = moderadamente diferenciado, "s/" = sin, "ILV" = invasión linfovascular, "gang" = ganglios, "marg" = márgenes, "G2" = grado 2, etc.

--- PROTOCOL FIELDS ---
{FIELDS}

Respond ONLY with a JSON object:
{"narrative": "The complete report text in formal Spanish...", "extracted_fields": {"field_name": "extracted value or null if not in the input"}}
ONLY the JSON object. No explanation, no markdown fences.`;

const VALIDATOR_PROMPT_TEMPLATE = `You are a clinical reasoning agent for pathology report quality control.
Your role is NOT to count missing fields (the system already does that).
Your role IS to detect CLINICAL INCONSISTENCIES and provide CLINICAL INSIGHTS that only a domain expert would notice.
IMPORTANT: Respond ENTIRELY in {LANG}. Every string value MUST be in {LANG}.
Respond ONLY with a JSON object. No markdown fences, no explanation.
Output schema:
{
  "inconsistencies": [
    {"finding": "What is clinically wrong", "severity": "warning"|"error", "suggestion": "How to fix it"}
  ],
  "clinical_alerts": [
    {"alert": "Clinically relevant observation", "type": "info"|"warning"}
  ]
}
Focus on:
- Cross-field inconsistencies (e.g. pT3 but depth says submucosa, diffuse type but grade G1, HER2 2+ without FISH)
- Unusual values (e.g. mitotic index > 20, lymph node count < 12 for colon, Breslow > 10mm)
- Protocol-specific rules that require clinical knowledge
- Staging coherence (does pTNM match the individual T, N, M values?)
- Missing biomarkers that are required for treatment decisions (MMR/MSI in colon, HER2 in gastric/breast)
DO NOT list missing fields — the system already shows those.
DO NOT count completeness — the system already calculates that.
If there are NO inconsistencies and NO alerts, return empty arrays.
Each issue MUST be a SEPARATE object — never combine.
Keep text SHORT (1-2 sentences max per item).
--- PROTOCOL FIELDS ---
{FIELDS}
--- PROTOCOL RULES ---
{RULES}`;

// --- LLM call ---
async function callLLM(env, systemPrompt, userContent) {
  const apiKey = env.OPENROUTER_API_KEY || '';
  console.log('Using API key ending in:', apiKey.slice(-6));
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJSON(raw) {
  let text = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) {
      let candidate = text.slice(first, last + 1);
      candidate = candidate.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(candidate);
    }
    throw new Error("Could not parse JSON from LLM output");
  }
}

// --- Auditor validator prompt (full audit: completeness + inconsistencies + CIE-O) ---
const AUDITOR_VALIDATOR_PROMPT = `You are a complete quality auditor for pathology reports.
Analyze the extracted data against the protocol and provide a FULL audit report.
IMPORTANT: Respond ENTIRELY in {LANG}. Every string value MUST be in {LANG}.
Respond ONLY with a JSON object. No markdown fences.
Output schema:
{
  "completeness_score": 0-100,
  "total_required_fields": int,
  "reported_fields": int,
  "status": "complete"|"mostly_complete"|"incomplete"|"critically_incomplete",
  "missing_required": [
    {"field": "field_name", "label": "Human name in {LANG}", "severity": "critical"|"major"|"minor", "action": "What to do in {LANG}"}
  ],
  "inconsistencies": [
    {"finding": "SHORT summary in 1 line (e.g. 'pT1 + pN2b + M1a inconsistente')", "detail": "Brief explanation in 1-2 lines", "severity": "warning"|"error", "suggestion": "Action in 1 line"}
  ],
  "clinical_alerts": [
    {"alert": "SHORT clinical observation in 1-2 lines max", "type": "info"|"warning"}
  ],
  "suggested_coding": {
    "topography": "CIE-O topography code (e.g. C18.7) or null",
    "topography_label": "Name in {LANG}",
    "morphology": "CIE-O morphology code (e.g. M8140/3) or null",
    "morphology_label": "Name in {LANG}"
  }
}
Rules:
- CRITICAL: prevents staging/treatment. MAJOR: required by protocol. MINOR: recommended.
- Status: complete>=90, mostly_complete 70-89, incomplete 50-69, critically_incomplete<50.
- "not_reported" or null = MISSING.
- Each issue = SEPARATE object.
- INCONSISTENCY SEVERITY:
  * "error" = IMPOSSIBLE combinations that CANNOT exist anatomically or logically:
    - Right hemicolectomy + sigmoid/descending/splenic location (wrong side of colon)
    - Left hemicolectomy + cecum/ascending (wrong side of colon)
    - Positive lymph nodes > examined lymph nodes
    - pT4 with depth reported as submucosa (pT1)
    - Breslow 0.5mm with pT4 (impossible staging)
    - More than 100% Ki-67
  * "warning" = UNUSUAL but clinically POSSIBLE findings that the pathologist should verify:
    - Signet ring cell carcinoma limited to mucosa (rare but exists)
    - Very high mitotic index for the tumor type
    - Young patient with diffuse gastric cancer (consider CDH1)
    - Low lymph node count for the procedure type
  * RULE: If the finding is anatomically/logically impossible → "error". If it is rare but can exist in clinical practice → "warning". When in doubt → "warning".
- TEXT QUALITY CHECK (CRITICAL — read every sentence carefully):
  * You are a senior pathologist reviewing this report before sign-out.
  * Read EVERY sentence and ask: "Does this sentence make clinical sense in a pathology report?"
  * Flag ANY text that is NOT standard pathology language: random phrases, personal notes, nonsense, jokes, typos that change meaning.
  * Common errors to detect: "muerte" instead of "muestra", wrong anatomical terms, sentences about non-medical topics, placeholder text, gibberish.
  * Report these as "error" severity with the exact problematic fragment quoted.
  * If a sentence has NO relation to pathology (e.g. about astronauts, weather, personal life), it MUST be flagged as error.
- COMPLETENESS CHECK: If the report has very few clinical data points (<5 fields identifiable), warn that the report appears too incomplete for meaningful audit.
- suggested_coding: derive CIE-O codes from the histologic type and tumor location in the report.
- Keep ALL text SHORT and scannable. The pathologist has 2 seconds to read each item.
- "finding" must be ONE LINE (max 15 words). Example: "Ganglios positivos (9) > examinados (8)"
- "detail" is the brief explanation (1-2 lines max). Example: "pN2b y M1a no son compatibles con pT1"
- "suggestion" is the action (1 line). Example: "Revisar estadificación"
- "alert" must be 1-2 lines max. NO paragraphs.
--- PROTOCOL FIELDS ---
{FIELDS}
--- PROTOCOL RULES ---
{RULES}`;

// --- Pipeline: Auditor mode ---
async function runAuditor(env, reportText, protocol, protocolId, lang = 'es') {
  const fieldsText = protocol.fields.join(", ");
  const rulesText = protocol.rules.join("\n");
  const langFull = lang === 'es' ? 'Spanish (español)' : 'English';

  // Extract
  const extractorPrompt = EXTRACTOR_PROMPT_TEMPLATE.replace("{FIELDS}", fieldsText);
  const extractRaw = await callLLM(env, extractorPrompt, reportText);
  const extractedData = parseJSON(extractRaw);

  // Full audit validation (completeness + inconsistencies + CIE-O)
  const validatorPrompt = AUDITOR_VALIDATOR_PROMPT
    .replace("{FIELDS}", fieldsText)
    .replace("{RULES}", rulesText)
    .replace(/{LANG}/g, langFull);
  const validateInput = `--- ORIGINAL REPORT TEXT (review for errors, nonsense, non-clinical text) ---\n${reportText}\n\n--- EXTRACTED DATA (review for completeness and inconsistencies) ---\n${JSON.stringify(extractedData, null, 2)}`;
  const validateRaw = await callLLM(env, validatorPrompt, validateInput);
  const validation = parseJSON(validateRaw);

  return { extractedData, validation };
}

// --- Pipeline: Copilot mode ---
async function runCopilot(env, abbreviatedNotes, protocol, protocolId) {
  const fieldsText = protocol.fields.join(", ");
  const rulesText = protocol.rules.join("\n");

  // Expand
  const expanderPrompt = EXPANDER_PROMPT_TEMPLATE.replace("{FIELDS}", fieldsText);
  const expandRaw = await callLLM(env, expanderPrompt, abbreviatedNotes);
  const expanded = parseJSON(expandRaw);

  const narrative = expanded.narrative || abbreviatedNotes;
  const extractedFields = expanded.extracted_fields || {};

  const filledFields = Object.keys(extractedFields).filter(
    (k) => extractedFields[k] !== null && extractedFields[k] !== "not_reported"
  );
  const pendingFields = Object.keys(extractedFields).filter(
    (k) => extractedFields[k] === null || extractedFields[k] === "not_reported"
  );

  // Skip validate in copilot — user can do it later with "Review with AI"
  return { narrative, extractedFields, filledFields, pendingFields, validation: null };
}

// --- Main handler ---
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed. Use POST /api/analyze" },
        { status: 405, headers: corsHeaders }
      );
    }

    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return Response.json(
        { error: "Rate limit exceeded", user_message: "Demasiadas solicitudes. Espere un minuto.", retry_after_seconds: 60 },
        { status: 429, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();

      // Access code
      // Support multiple access codes: ACCESS_CODE (primary) + DEMO_CODE (public demo)
      const validCodes = [env.ACCESS_CODE, env.DEMO_CODE].filter(Boolean)
      if (!body.access_code || !validCodes.includes(body.access_code)) {
        return Response.json(
          { error: "Invalid access code", user_message: "Código de acceso incorrecto." },
          { status: 401, headers: corsHeaders }
        );
      }

      const reportText = body.report_text;
      const mode = body.mode || "auditor";

      if (!reportText || typeof reportText !== "string") {
        return Response.json({ error: "Missing report_text field" }, { status: 400, headers: corsHeaders });
      }
      if (reportText.length > MAX_REPORT_SIZE) {
        return Response.json(
          { error: `Report too long (${reportText.length} chars, max ${MAX_REPORT_SIZE})` },
          { status: 400, headers: corsHeaders }
        );
      }

      const startTime = Date.now();
      const includesMacro = body.include_macro !== false;

      // Step 1: Classify (skip if protocol_id provided by frontend)
      let classification;
      let protocolId;
      let needsHumanReview = false;

      if (body.protocol_id && PROTOCOLS[body.protocol_id]) {
        // Frontend selected protocol — skip classify LLM call
        protocolId = body.protocol_id;
        classification = {
          specimen_type: "user_selected",
          organ_system: PROTOCOLS[protocolId].fields[0] ? "specified" : "other",
          tumor_type_suspected: "User-selected protocol",
          protocol_to_apply: protocolId,
          confidence: 1.0,
        };
      } else {
        // Auto-classify via LLM
        const classifyRaw = await callLLM(env, CLASSIFIER_PROMPT, reportText);
        classification = parseJSON(classifyRaw);
        protocolId = classification.protocol_to_apply || "generic";
        if ((classification.confidence || 0) < 0.7) {
          protocolId = "generic";
          needsHumanReview = true;
        }
      }

      const protocol = PROTOCOLS[protocolId];
      const elapsedMs = () => Date.now() - startTime;

      // Route by mode
      if (mode === "copilot" && protocol) {
        const copilot = await runCopilot(env, reportText, protocol, protocolId);

        return Response.json({
          mode: "copilot",
          classification,
          expanded_report: copilot.narrative,
          extracted_fields: copilot.extractedFields,
          filled_fields: copilot.filledFields,
          pending_fields: copilot.pendingFields,
          validation: copilot.validation,
          labels: protocol.labels_es,
          labels_en: protocol.labels_en,
          audit_trail: {
            timestamp: new Date().toISOString(),
            protocol_used: protocolId,
            completeness_score: copilot.validation ? copilot.validation.completeness_score : 0,
            model_version: env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
            provider: "openrouter",
            processing_time_ms: elapsedMs(),
            pipeline_version: "0.2.0",
          },
          needs_human_review: needsHumanReview,
        }, { headers: corsHeaders });
      }

      // Auditor mode (default)
      if (protocol) {
        const userLang = body.lang || 'es';
        const auditor = await runAuditor(env, reportText, protocol, protocolId, userLang);

        return Response.json({
          mode: "auditor",
          classification,
          extracted_data: auditor.extractedData,
          validation: auditor.validation,
          labels: protocol.labels_es,
          labels_en: protocol.labels_en,
          audit_trail: {
            timestamp: new Date().toISOString(),
            protocol_used: protocolId,
            completeness_score: auditor.validation.completeness_score,
            model_version: env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
            provider: "openrouter",
            processing_time_ms: elapsedMs(),
            pipeline_version: "0.2.0",
          },
          needs_human_review: needsHumanReview,
        }, { headers: corsHeaders });
      }

      // No protocol matched
      return Response.json({
        mode,
        classification,
        extracted_data: {},
        validation: {
          completeness_score: 0, total_required_fields: 0, reported_fields: 0,
          missing_fields: 0, status: "incomplete", missing_required: [],
          inconsistencies: [], quality_notes: "Generic protocol — no structured validation",
        },
        audit_trail: {
          timestamp: new Date().toISOString(),
          protocol_used: protocolId,
          completeness_score: 0,
          model_version: "z-ai/glm-5",
          provider: "openrouter",
          processing_time_ms: elapsedMs(),
          pipeline_version: "0.2.0",
        },
        needs_human_review: true,
      }, { headers: corsHeaders });

    } catch (err) {
      console.error("Pipeline error:", err);
      return Response.json(
        { error: "Pipeline error", user_message: "Error procesando. Intente de nuevo en unos minutos.", details: err.message },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
