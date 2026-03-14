/**
 * Pathology Report Structuring Agent — Cloudflare Worker
 *
 * POST /api/analyze  { report_text: "..." }
 * Returns: PipelineResult JSON (classification + extraction + validation + audit)
 *
 * API key lives in Worker env secret OPENROUTER_API_KEY — never exposed to browser.
 * Access code lives in Worker env secret ACCESS_CODE — validated server-side.
 */

// --- Rate limiting (in-memory, resets on cold start) ---
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW_MS = 60_000;
const MAX_REPORT_SIZE = 50_000;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || [];
  const recent = entry.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    return false;
  }
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
Analyze the pathology report and classify it.
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

const VALIDATOR_PROMPT_TEMPLATE = `You are a quality control agent for pathology reports.
Compare the extracted data against the protocol's REQUIRED fields and rules.
Respond ONLY with a JSON object.
Output: {"completeness_score":0-100,"total_required_fields":int,"reported_fields":int,"missing_fields":int,"status":"complete"|"mostly_complete"|"incomplete"|"critically_incomplete","missing_required":[{"field":"...","severity":"critical"|"major"|"minor","recommendation":"..."}],"inconsistencies":[{"finding":"...","severity":"warning"|"error"}],"quality_notes":"..."}
Severity: CRITICAL=prevents staging/treatment, MAJOR=required by protocol, MINOR=recommended.
Status: complete>=90, mostly_complete 70-89, incomplete 50-69, critically_incomplete<50.
A field with value "not_reported" counts as MISSING.
--- PROTOCOL FIELDS ---
{FIELDS}
--- PROTOCOL RULES ---
{RULES}`;

// --- LLM call ---
async function callLLM(env, systemPrompt, userContent) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "z-ai/glm-5",
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
  // Strip markdown fences
  let text = raw.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    // Find first { and last }
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

// --- Main handler ---
export default {
  async fetch(request, env) {
    // CORS
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

    // Rate limiting
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          user_message: "Demasiadas solicitudes. Espere un minuto e intente de nuevo.",
          retry_after_seconds: 60,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    try {
      const body = await request.json();

      // Access code validation (server-side, never in frontend)
      const accessCode = body.access_code;
      if (!accessCode || accessCode !== env.ACCESS_CODE) {
        return Response.json(
          {
            error: "Invalid access code",
            user_message: "Código de acceso incorrecto.",
          },
          { status: 401, headers: corsHeaders }
        );
      }

      const reportText = body.report_text;

      if (!reportText || typeof reportText !== "string") {
        return Response.json(
          { error: "Missing report_text field" },
          { status: 400, headers: corsHeaders }
        );
      }

      if (reportText.length > MAX_REPORT_SIZE) {
        return Response.json(
          {
            error: `Report too long (${reportText.length} chars, max ${MAX_REPORT_SIZE})`,
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const startTime = Date.now();

      // Step 1: Classify
      const classifyRaw = await callLLM(env, CLASSIFIER_PROMPT, reportText);
      const classification = parseJSON(classifyRaw);

      // Determine protocol
      let protocolId = classification.protocol_to_apply || "generic";
      let needsHumanReview = false;
      if ((classification.confidence || 0) < 0.7) {
        protocolId = "generic";
        needsHumanReview = true;
      }

      const protocol = PROTOCOLS[protocolId];

      // Step 2: Extract
      let extractedData = {};
      if (protocol) {
        const fieldsText = protocol.fields.join(", ");
        const extractorPrompt = EXTRACTOR_PROMPT_TEMPLATE.replace("{FIELDS}", fieldsText);
        const extractRaw = await callLLM(env, extractorPrompt, reportText);
        extractedData = parseJSON(extractRaw);
      }

      // Step 3: Validate
      let validation = {
        completeness_score: 0,
        total_required_fields: 0,
        reported_fields: 0,
        missing_fields: 0,
        status: "incomplete",
        missing_required: [],
        inconsistencies: [],
        quality_notes: "Generic protocol — no structured validation",
      };

      if (protocol) {
        const fieldsText = protocol.fields.join(", ");
        const rulesText = protocol.rules.join("\n");
        const validatorPrompt = VALIDATOR_PROMPT_TEMPLATE
          .replace("{FIELDS}", fieldsText)
          .replace("{RULES}", rulesText);
        const validateRaw = await callLLM(
          env,
          validatorPrompt,
          JSON.stringify(extractedData, null, 2)
        );
        validation = parseJSON(validateRaw);
      }

      const elapsedMs = Date.now() - startTime;

      // Build result
      const result = {
        classification,
        extracted_data: extractedData,
        validation,
        audit_trail: {
          timestamp: new Date().toISOString(),
          protocol_used: protocolId,
          completeness_score: validation.completeness_score,
          model_version: "z-ai/glm-5",
          provider: "openrouter",
          processing_time_ms: elapsedMs,
          pipeline_version: "0.1.0",
        },
        needs_human_review: needsHumanReview,
      };

      return Response.json(result, { headers: corsHeaders });
    } catch (err) {
      console.error("Pipeline error:", err);
      return Response.json(
        {
          error: "Pipeline error",
          user_message:
            "Error procesando el informe. Por favor, intente de nuevo en unos minutos.",
          details: err.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
