// Inline deterministic validation rules — no AI needed
// Evaluated instantly on every field change

import type { FormValues } from '../hooks/useFormState'

export interface InlineAlert {
  id: string
  severity: 'error' | 'warning' | 'info'
  message_es: string
  message_en: string
  field?: string // which field triggered it
}

type RuleFn = (values: FormValues) => InlineAlert | null

// --- COLON RULES ---
const colonRules: RuleFn[] = [
  // Anatomía incompatible: procedimiento vs localización
  (v) => {
    const proc = v.procedure_type || ''
    const loc = v.tumor_location || ''
    // Hemicolectomía derecha solo para: ciego, ascendente, hepático, transverso proximal
    const rightProcs = ['right_hemicolectomy']
    const leftLocations = ['sigmoid', 'descending', 'splenic', 'rectum', 'rectosigmoid']
    // Hemicolectomía izquierda / sigmoidectomía solo para: sigmoide, descendente, esplénico
    const leftProcs = ['left_hemicolectomy', 'sigmoidectomy']
    const rightLocations = ['cecum', 'ascending', 'hepatic']

    if (rightProcs.includes(proc) && leftLocations.includes(loc))
      return { id: 'anatomy_mismatch', severity: 'error', field: 'procedure_type',
        message_es: `ERROR ANATÓMICO: Hemicolectomía derecha NO es compatible con ${loc === 'sigmoid' ? 'colon sigmoide' : loc} (lado izquierdo del colon)`,
        message_en: `ANATOMICAL ERROR: Right hemicolectomy is NOT compatible with ${loc} (left side of colon)` }
    if (leftProcs.includes(proc) && rightLocations.includes(loc))
      return { id: 'anatomy_mismatch', severity: 'error', field: 'procedure_type',
        message_es: `ERROR ANATÓMICO: ${proc === 'sigmoidectomy' ? 'Sigmoidectomía' : 'Hemicolectomía izquierda'} NO es compatible con ${loc === 'cecum' ? 'ciego' : loc} (lado derecho del colon)`,
        message_en: `ANATOMICAL ERROR: ${proc === 'sigmoidectomy' ? 'Sigmoidectomy' : 'Left hemicolectomy'} is NOT compatible with ${loc} (right side of colon)` }
    return null
  },
  // Ganglios positivos > examinados
  (v) => {
    const exam = parseInt(v.lymph_nodes_examined || '')
    const pos = parseInt(v.lymph_nodes_positive || '')
    if (!isNaN(exam) && !isNaN(pos) && pos > exam)
      return { id: 'ln_pos_gt_exam', severity: 'error', field: 'lymph_nodes_positive',
        message_es: `Ganglios positivos (${pos}) no puede ser mayor que examinados (${exam})`,
        message_en: `Positive nodes (${pos}) cannot exceed examined nodes (${exam})` }
    return null
  },
  // Menos de 12 ganglios
  (v) => {
    const exam = parseInt(v.lymph_nodes_examined || '')
    if (!isNaN(exam) && exam > 0 && exam < 12)
      return { id: 'ln_lt_12', severity: 'warning', field: 'lymph_nodes_examined',
        message_es: `Solo ${exam} ganglios examinados — mínimo recomendado: 12 (CAP/AJCC)`,
        message_en: `Only ${exam} nodes examined — minimum recommended: 12 (CAP/AJCC)` }
    return null
  },
  // pT inconsistente con profundidad
  (v) => {
    const depth = v.depth_of_invasion || ''
    const pt = v.pt_stage || ''
    if (!depth || !pt) return null
    const depthToPt: Record<string, string[]> = {
      'submucosa_pt1': ['pt1'],
      'muscularis_pt2': ['pt2'],
      'subserosa_pt3': ['pt3'],
      'serosa_pt4a': ['pt4a'],
      'adjacent_pt4b': ['pt4b'],
    }
    const expected = depthToPt[depth]
    if (expected && !expected.some(e => pt.startsWith(e)))
      return { id: 'pt_depth_mismatch', severity: 'error', field: 'pt_stage',
        message_es: `pT seleccionado (${pt}) no coincide con la profundidad de invasión reportada`,
        message_en: `Selected pT (${pt}) doesn't match reported depth of invasion` }
    return null
  },
  // pT3+ sin ganglios reportados
  (v) => {
    const pt = v.pt_stage || ''
    const exam = v.lymph_nodes_examined || ''
    if ((pt === 'pt3' || pt === 'pt4a' || pt === 'pt4b') && !exam)
      return { id: 'pt3_no_nodes', severity: 'warning', field: 'lymph_nodes_examined',
        message_es: `pT3+ requiere evaluación ganglionar — no se han reportado ganglios`,
        message_en: `pT3+ requires lymph node evaluation — no nodes reported` }
    return null
  },
  // MMR no reportado con adenocarcinoma
  (v) => {
    const hist = v.histologic_type || ''
    const mmr = v.mmr_msi || ''
    if (hist && hist.includes('adeno') && !mmr)
      return { id: 'mmr_missing_adeno', severity: 'warning', field: 'mmr_msi',
        message_es: `Adenocarcinoma colorrectal: estado MMR/MSI recomendado en todos los casos (NCCN)`,
        message_en: `Colorectal adenocarcinoma: MMR/MSI status recommended in all cases (NCCN)` }
    return null
  },
]

// --- MELANOMA RULES ---
const melanomaRules: RuleFn[] = [
  // Breslow > 4mm sin pT4
  (v) => {
    const breslow = parseFloat(v.breslow_thickness || '')
    const pt = v.pt_stage || ''
    if (!isNaN(breslow) && breslow > 4.0 && pt && !pt.startsWith('pt4'))
      return { id: 'breslow_pt4', severity: 'error', field: 'pt_stage',
        message_es: `Breslow ${breslow}mm (>4.0mm) corresponde a pT4 — pT seleccionado no coincide`,
        message_en: `Breslow ${breslow}mm (>4.0mm) corresponds to pT4 — selected pT doesn't match` }
    return null
  },
  // Clark I con Breslow > 1mm
  (v) => {
    const breslow = parseFloat(v.breslow_thickness || '')
    const clark = v.clark_level || ''
    if (!isNaN(breslow) && breslow > 1.0 && clark === 'I')
      return { id: 'clark_breslow_mismatch', severity: 'warning', field: 'clark_level',
        message_es: `Clark I con Breslow ${breslow}mm es inusual — verificar nivel de Clark`,
        message_en: `Clark I with Breslow ${breslow}mm is unusual — verify Clark level` }
    return null
  },
  // Ulceración no reportada con Breslow > 0
  (v) => {
    const breslow = parseFloat(v.breslow_thickness || '')
    const ulc = v.ulceration || ''
    if (!isNaN(breslow) && breslow > 0 && !ulc)
      return { id: 'ulceration_missing', severity: 'warning', field: 'ulceration',
        message_es: `Ulceración es obligatoria para estadificación pT del melanoma (AJCC 8)`,
        message_en: `Ulceration is required for melanoma pT staging (AJCC 8)` }
    return null
  },
]

// --- GASTRIC RULES ---
const gastricRules: RuleFn[] = [
  // Ganglios positivos > examinados
  (v) => {
    const exam = parseInt(v.lymph_nodes_examined || '')
    const pos = parseInt(v.lymph_nodes_positive || '')
    if (!isNaN(exam) && !isNaN(pos) && pos > exam)
      return { id: 'ln_pos_gt_exam', severity: 'error', field: 'lymph_nodes_positive',
        message_es: `Ganglios positivos (${pos}) no puede ser mayor que examinados (${exam})`,
        message_en: `Positive nodes (${pos}) cannot exceed examined nodes (${exam})` }
    return null
  },
  // Menos de 16 ganglios
  (v) => {
    const exam = parseInt(v.lymph_nodes_examined || '')
    if (!isNaN(exam) && exam > 0 && exam < 16)
      return { id: 'ln_lt_16', severity: 'warning', field: 'lymph_nodes_examined',
        message_es: `Solo ${exam} ganglios examinados — mínimo recomendado: 16 para gastrectomía D2`,
        message_en: `Only ${exam} nodes examined — minimum recommended: 16 for D2 gastrectomy` }
    return null
  },
  // HER2 2+ sin FISH
  (v) => {
    const her2 = v.her2_status || ''
    if (her2 === 'equivocal_2plus')
      return { id: 'her2_fish', severity: 'warning', field: 'her2_status',
        message_es: `HER2 equívoco (2+): se requiere ISH/FISH para confirmación`,
        message_en: `HER2 equivocal (2+): ISH/FISH confirmation required` }
    return null
  },
  // Tipo difuso sin G3
  (v) => {
    const hist = v.histologic_type_lauren || v.histologic_type || ''
    const grade = v.histologic_grade || ''
    if (hist.includes('diffuse') && grade && grade !== 'g3' && grade !== 'gx')
      return { id: 'diffuse_g3', severity: 'warning', field: 'histologic_grade',
        message_es: `Tipo difuso (Laurén) es por definición poco diferenciado — considerar G3`,
        message_en: `Diffuse type (Laurén) is by definition poorly differentiated — consider G3` }
    return null
  },
]

// --- BREAST RULES ---
const breastRules: RuleFn[] = [
  // HER2 2+ sin ISH
  (v) => {
    const her2 = v.her2_status || ''
    if (her2 === 'equivocal_2plus')
      return { id: 'her2_ish', severity: 'error', field: 'her2_status',
        message_es: `HER2 equívoco (IHC 2+): ISH obligatoria para clasificación definitiva`,
        message_en: `HER2 equivocal (IHC 2+): ISH required for definitive classification` }
    return null
  },
  // Triple negativo → considerar BRCA
  (v) => {
    const er = v.er_status || ''
    const pr = v.pr_status || ''
    const her2 = v.her2_status || ''
    if (er === 'negative' && pr === 'negative' && (her2 === 'negative_0' || her2 === 'negative_1plus'))
      return { id: 'tnbc_brca', severity: 'info', field: 'her2_status',
        message_es: `Triple negativo (RE−/RP−/HER2−): considerar testing germinal BRCA1/2`,
        message_en: `Triple-negative (ER−/PR−/HER2−): consider germline BRCA1/2 testing` }
    return null
  },
]

// --- CERVIX RULES ---
const cervixRules: RuleFn[] = [
  // Invasión estromal > 5mm → no puede ser pT1a
  (v) => {
    const depth = parseFloat(v.stromal_invasion_depth_mm || '')
    const pt = v.pt_category || ''
    if (!isNaN(depth) && depth > 5 && pt.includes('1a'))
      return { id: 'depth_gt5_not_1a', severity: 'error', field: 'pt_category',
        message_es: `Invasión estromal ${depth}mm (>5mm): tumor es al menos pT1b1 — los tumores macroscópicos nunca son pT1a`,
        message_en: `Stromal invasion ${depth}mm (>5mm): tumor is at least pT1b1 — macroscopic tumors are never pT1a` }
    return null
  },
  // LVI no altera pT1a (FIGO 2018 corrigendum)
  (v) => {
    const lvi = v.lvi || ''
    const pt = v.pt_category || ''
    if (lvi === 'present' && pt.includes('1a'))
      return { id: 'lvi_pt1a_note', severity: 'info', field: 'lvi',
        message_es: `Nota: LVI NO altera el estadio pT1a (AJCC-UICC 9 / FIGO 2018 Corrigendum)`,
        message_en: `Note: LVI does NOT alter pT1a stage (AJCC-UICC 9 / FIGO 2018 Corrigendum)` }
    return null
  },
  // HPV-independiente → peor pronóstico
  (v) => {
    const hist = v.histologic_type || ''
    if (hist.includes('hpv_independent') || hist.includes('hpv_indep'))
      return { id: 'hpv_indep_prognosis', severity: 'warning', field: 'histologic_type',
        message_es: `Carcinoma HPV-independiente: generalmente peor pronóstico que HPV-asociado`,
        message_en: `HPV-independent carcinoma: generally worse prognosis than HPV-associated` }
    return null
  },
]

// Registry
const rulesByProtocol: Record<string, RuleFn[]> = {
  'colon-resection': colonRules,
  'melanoma': melanomaRules,
  'gastric': gastricRules,
  'breast-biopsy': breastRules,
  'cytology-cervical': cervixRules,
}

export function evaluateRules(protocolId: string, values: FormValues): InlineAlert[] {
  const rules = rulesByProtocol[protocolId]
  if (!rules) return []
  return rules.map(r => r(values)).filter((a): a is InlineAlert => a !== null)
}
