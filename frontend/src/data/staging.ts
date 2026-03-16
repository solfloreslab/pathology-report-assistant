// Auto-suggestion rules for pTNM staging (AJCC 8th Edition)
// These are SUGGESTIONS only — the pathologist always decides

import type { FormValues } from '../hooks/useFormState'
import type { Lang } from './i18n'

export interface StagingSuggestion {
  field: string
  value: string
  reasoning_es: string
  reasoning_en: string
}

export interface StagingTableEntry {
  stage: string
  criteria_es: string
  criteria_en: string
}

export interface StagingReference {
  title_es: string
  title_en: string
  source: string
  entries: StagingTableEntry[]
}

// ─── MELANOMA ───

const melanomaPtTable: StagingReference = {
  title_es: 'Estadificación pT — Melanoma cutáneo',
  title_en: 'pT Staging — Cutaneous Melanoma',
  source: 'AJCC 8th Edition, 2017',
  entries: [
    { stage: 'pTis', criteria_es: 'Melanoma in situ', criteria_en: 'Melanoma in situ' },
    { stage: 'pT1a', criteria_es: '≤0.8 mm sin ulceración', criteria_en: '≤0.8 mm without ulceration' },
    { stage: 'pT1b', criteria_es: '≤0.8 mm con ulceración, o 0.8–1.0 mm', criteria_en: '≤0.8 mm with ulceration, or 0.8–1.0 mm' },
    { stage: 'pT2a', criteria_es: '>1.0–2.0 mm sin ulceración', criteria_en: '>1.0–2.0 mm without ulceration' },
    { stage: 'pT2b', criteria_es: '>1.0–2.0 mm con ulceración', criteria_en: '>1.0–2.0 mm with ulceration' },
    { stage: 'pT3a', criteria_es: '>2.0–4.0 mm sin ulceración', criteria_en: '>2.0–4.0 mm without ulceration' },
    { stage: 'pT3b', criteria_es: '>2.0–4.0 mm con ulceración', criteria_en: '>2.0–4.0 mm with ulceration' },
    { stage: 'pT4a', criteria_es: '>4.0 mm sin ulceración', criteria_en: '>4.0 mm without ulceration' },
    { stage: 'pT4b', criteria_es: '>4.0 mm con ulceración', criteria_en: '>4.0 mm with ulceration' },
  ],
}

function suggestMelanomaPt(values: FormValues): StagingSuggestion | null {
  const breslow = parseFloat(values['breslow_thickness'] || '')
  const ulceration = values['ulceration']
  if (isNaN(breslow) || !ulceration || ulceration === '') return null

  const hasUlc = ulceration === 'present'
  let stage = ''

  if (breslow <= 0.8 && !hasUlc) stage = 'pT1a'
  else if (breslow <= 1.0) stage = 'pT1b'
  else if (breslow <= 2.0) stage = hasUlc ? 'pT2b' : 'pT2a'
  else if (breslow <= 4.0) stage = hasUlc ? 'pT3b' : 'pT3a'
  else stage = hasUlc ? 'pT4b' : 'pT4a'

  return {
    field: 'pt_stage',
    value: stage,
    reasoning_es: `Breslow ${breslow} mm, ${hasUlc ? 'con' : 'sin'} ulceración`,
    reasoning_en: `Breslow ${breslow} mm, ${hasUlc ? 'with' : 'without'} ulceration`,
  }
}

// ─── COLON ───

const colonPtTable: StagingReference = {
  title_es: 'Estadificación pT — Colon/Recto',
  title_en: 'pT Staging — Colon/Rectum',
  source: 'AJCC 8th Edition, 2017',
  entries: [
    { stage: 'pTis', criteria_es: 'Carcinoma in situ / displasia de alto grado', criteria_en: 'Carcinoma in situ / high-grade dysplasia' },
    { stage: 'pT1', criteria_es: 'Invade submucosa', criteria_en: 'Invades submucosa' },
    { stage: 'pT2', criteria_es: 'Invade muscular propia', criteria_en: 'Invades muscularis propria' },
    { stage: 'pT3', criteria_es: 'Invade tejido pericolónico/perirrectal', criteria_en: 'Invades pericolorectal tissues' },
    { stage: 'pT4a', criteria_es: 'Penetra superficie peritoneal (serosa)', criteria_en: 'Penetrates visceral peritoneum (serosa)' },
    { stage: 'pT4b', criteria_es: 'Invade/adhiere a órganos adyacentes', criteria_en: 'Invades/adheres to adjacent organs' },
  ],
}

const colonPnTable: StagingReference = {
  title_es: 'Estadificación pN — Colon/Recto',
  title_en: 'pN Staging — Colon/Rectum',
  source: 'AJCC 8th Edition, 2017',
  entries: [
    { stage: 'pN0', criteria_es: 'Sin metástasis ganglionar', criteria_en: 'No regional lymph node metastasis' },
    { stage: 'pN1a', criteria_es: '1 ganglio positivo', criteria_en: '1 positive node' },
    { stage: 'pN1b', criteria_es: '2–3 ganglios positivos', criteria_en: '2–3 positive nodes' },
    { stage: 'pN1c', criteria_es: 'Depósitos tumorales sin ganglios positivos', criteria_en: 'Tumor deposits without positive nodes' },
    { stage: 'pN2a', criteria_es: '4–6 ganglios positivos', criteria_en: '4–6 positive nodes' },
    { stage: 'pN2b', criteria_es: '≥7 ganglios positivos', criteria_en: '≥7 positive nodes' },
  ],
}

function suggestColonPt(values: FormValues): StagingSuggestion | null {
  const depth = values['depth_of_invasion']
  if (!depth) return null

  // Values match dropdown option values in protocols.ts
  const mapping: Record<string, string> = {
    'pTis': 'pTis',
    'pT1': 'pT1',
    'pT2': 'pT2',
    'pT3': 'pT3',
    'pT4a': 'pT4a',
    'pT4b': 'pT4b',
    // Legacy keys
    'submucosa': 'pT1',
    'muscularis_propria': 'pT2',
    'pericolorectal': 'pT3',
    'serosa': 'pT4a',
    'adjacent_organs': 'pT4b',
  }

  const stage = mapping[depth]
  if (!stage) return null

  const depthLabels: Record<string, [string, string]> = {
    'pTis': ['Mucosa (in situ)', 'Mucosa (in situ)'],
    'pT1': ['Submucosa', 'Submucosa'],
    'pT2': ['Muscular propia', 'Muscularis propria'],
    'pT3': ['Subserosa', 'Subserosa'],
    'pT4a': ['Serosa', 'Serosa'],
    'pT4b': ['Órganos adyacentes', 'Adjacent organs'],
    'submucosa': ['Submucosa', 'Submucosa'],
    'muscularis_propria': ['Muscular propia', 'Muscularis propria'],
    'pericolorectal': ['Tejido pericolónico', 'Pericolorectal tissues'],
    'serosa': ['Serosa', 'Serosa'],
    'adjacent_organs': ['Órganos adyacentes', 'Adjacent organs'],
  }
  const [es, en] = depthLabels[depth] || [depth, depth]

  return {
    field: 'pt_stage',
    value: stage,
    reasoning_es: `Profundidad: ${es}`,
    reasoning_en: `Depth: ${en}`,
  }
}

function suggestColonPn(values: FormValues): StagingSuggestion | null {
  const pos = parseInt(values['lymph_nodes_positive'] || '')
  const exam = parseInt(values['lymph_nodes_examined'] || '')
  if (isNaN(pos) || isNaN(exam)) return null

  let stage = ''
  if (pos === 0) stage = 'pN0'
  else if (pos === 1) stage = 'pN1a'
  else if (pos <= 3) stage = 'pN1b'
  else if (pos <= 6) stage = 'pN2a'
  else stage = 'pN2b'

  return {
    field: 'pn_stage',
    value: stage,
    reasoning_es: `${pos}/${exam} ganglios positivos`,
    reasoning_en: `${pos}/${exam} positive nodes`,
  }
}

// ─── MELANOMA pN ───

const melanomaPnTable: StagingReference = {
  title_es: 'Estadificación pN — Melanoma cutáneo',
  title_en: 'pN Staging — Cutaneous Melanoma',
  source: 'AJCC 8th Edition, 2017',
  entries: [
    { stage: 'pN0', criteria_es: 'Sin metástasis ganglionar', criteria_en: 'No regional node metastasis' },
    { stage: 'pN1a', criteria_es: '1 ganglio clínicamente oculto', criteria_en: '1 clinically occult node' },
    { stage: 'pN1b', criteria_es: '1 ganglio clínicamente detectado', criteria_en: '1 clinically detected node' },
    { stage: 'pN2a', criteria_es: '2–3 ganglios clínicamente ocultos', criteria_en: '2–3 clinically occult nodes' },
    { stage: 'pN2b', criteria_es: '2–3 ganglios clínicamente detectados', criteria_en: '2–3 clinically detected nodes' },
    { stage: 'pN3', criteria_es: '≥4 ganglios, o en tránsito/satélites con ganglios+', criteria_en: '≥4 nodes, or in-transit/satellites with positive nodes' },
  ],
}

// ─── pM (universal — aplica a todos los protocolos) ───

const pmTable: StagingReference = {
  title_es: 'Estadificación pM — Metástasis a distancia',
  title_en: 'pM Staging — Distant Metastasis',
  source: 'AJCC 8th Edition, 2017',
  entries: [
    { stage: 'M0', criteria_es: 'Sin metástasis a distancia', criteria_en: 'No distant metastasis' },
    { stage: 'M1', criteria_es: 'Metástasis a distancia presente', criteria_en: 'Distant metastasis present' },
    { stage: 'M1a', criteria_es: 'Metástasis en un solo órgano (sin peritoneo)', criteria_en: 'Metastasis to single organ (without peritoneum)' },
    { stage: 'M1b', criteria_es: 'Metástasis en más de un órgano (sin peritoneo)', criteria_en: 'Metastasis to more than one organ (without peritoneum)' },
    { stage: 'M1c', criteria_es: 'Metástasis peritoneal (con o sin otros órganos)', criteria_en: 'Peritoneal metastasis (with or without other organs)' },
    { stage: 'pMX', criteria_es: 'No evaluable', criteria_en: 'Cannot be assessed' },
  ],
}

// ─── PUBLIC API ───

// --- GASTRIC pT from depth ---
function suggestGastricPt(values: FormValues): StagingSuggestion | null {
  const depth = values['depth_of_invasion'] || values['tumor_extent']
  if (!depth) return null
  const mapping: Record<string, string> = {
    'pTis': 'pTis', 'pT1a': 'pT1a', 'pT1b': 'pT1b', 'pT2': 'pT2', 'pT3': 'pT3', 'pT4a': 'pT4a', 'pT4b': 'pT4b',
    'lamina_propria': 'pT1a', 'muscularis_mucosae': 'pT1a', 'submucosa': 'pT1b',
    'muscularis_propria': 'pT2', 'subserosal': 'pT3', 'serosa': 'pT4a', 'adjacent_structures': 'pT4b',
  }
  const stage = mapping[depth]
  if (!stage) return null
  return { field: 'pt_stage', value: stage, reason_es: `Profundidad: ${depth}`, reason_en: `Depth: ${depth}` }
}

// --- GASTRIC pN from nodes ---
function suggestGastricPn(values: FormValues): StagingSuggestion | null {
  const pos = parseInt(values['lymph_nodes_positive'] || '')
  if (isNaN(pos)) return null
  let stage: string
  if (pos === 0) stage = 'pN0'
  else if (pos <= 2) stage = 'pN1'
  else if (pos <= 6) stage = 'pN2'
  else if (pos <= 15) stage = 'pN3a'
  else stage = 'pN3b'
  return { field: 'pn_stage', value: stage, reason_es: `${pos} ganglios positivos`, reason_en: `${pos} positive nodes` }
}

// --- BREAST pT from size ---
function suggestBreastPt(values: FormValues): StagingSuggestion | null {
  const size = parseFloat(values['tumor_size'] || values['tumor_size_mm'] || '')
  if (isNaN(size) || size <= 0) return null
  // Size in mm for breast
  const mm = values['tumor_size_mm'] ? size : size * 10
  let stage: string
  if (mm <= 1) stage = 'pt1mi'
  else if (mm <= 5) stage = 'pt1a'
  else if (mm <= 10) stage = 'pt1b'
  else if (mm <= 20) stage = 'pt1c'
  else if (mm <= 50) stage = 'pt2'
  else stage = 'pt3'
  return { field: 'pt_category', value: stage, reason_es: `Tamaño: ${mm}mm`, reason_en: `Size: ${mm}mm` }
}

// --- BREAST pN from nodes ---
function suggestBreastPn(values: FormValues): StagingSuggestion | null {
  const macro = parseInt(values['lymph_nodes_with_macrometastases'] || values['lymph_nodes_positive'] || '')
  if (isNaN(macro)) return null
  let stage: string
  if (macro === 0) stage = 'pn0'
  else if (macro <= 3) stage = 'pn1a'
  else if (macro <= 9) stage = 'pn2a'
  else stage = 'pn3a'
  return { field: 'pn_category', value: stage, reason_es: `${macro} ganglios con macrometástasis`, reason_en: `${macro} nodes with macrometastases` }
}

// --- CERVIX pT from stromal invasion depth + tumor size ---
function suggestCervixPt(values: FormValues): StagingSuggestion | null {
  const depth = parseFloat(values['stromal_invasion_depth_mm'] || '')
  const size = parseFloat(values['tumor_size_cm'] || values['tumor_size'] || '')
  if (isNaN(depth) && isNaN(size)) return null

  let stage: string
  let reason_es: string
  let reason_en: string

  if (!isNaN(depth) && depth <= 3) {
    stage = 'pt1a1'; reason_es = `Invasión estromal ${depth}mm (≤3mm)`; reason_en = `Stromal invasion ${depth}mm (≤3mm)`
  } else if (!isNaN(depth) && depth <= 5) {
    stage = 'pt1a2'; reason_es = `Invasión estromal ${depth}mm (>3-5mm)`; reason_en = `Stromal invasion ${depth}mm (>3-5mm)`
  } else if (!isNaN(size) && size <= 2) {
    stage = 'pt1b1'; reason_es = `Tumor ${size}cm (≤2cm)`; reason_en = `Tumor ${size}cm (≤2cm)`
  } else if (!isNaN(size) && size <= 4) {
    stage = 'pt1b2'; reason_es = `Tumor ${size}cm (>2-4cm)`; reason_en = `Tumor ${size}cm (>2-4cm)`
  } else if (!isNaN(size) && size > 4) {
    stage = 'pt1b3'; reason_es = `Tumor ${size}cm (>4cm)`; reason_en = `Tumor ${size}cm (>4cm)`
  } else return null

  return { field: 'pt_category', value: stage, reason_es, reason_en }
}

export function getSuggestions(protocolId: string, values: FormValues): StagingSuggestion[] {
  const suggestions: StagingSuggestion[] = []

  if (protocolId === 'melanoma') {
    const pt = suggestMelanomaPt(values)
    if (pt) suggestions.push(pt)
  }

  if (protocolId === 'colon-resection') {
    const pt = suggestColonPt(values)
    if (pt) suggestions.push(pt)
    const pn = suggestColonPn(values)
    if (pn) suggestions.push(pn)
  }

  if (protocolId === 'gastric') {
    const pt = suggestGastricPt(values)
    if (pt) suggestions.push(pt)
    const pn = suggestGastricPn(values)
    if (pn) suggestions.push(pn)
  }

  if (protocolId === 'breast-biopsy') {
    const pt = suggestBreastPt(values)
    if (pt) suggestions.push(pt)
    const pn = suggestBreastPn(values)
    if (pn) suggestions.push(pn)
  }

  if (protocolId === 'cytology-cervical') {
    const pt = suggestCervixPt(values)
    if (pt) suggestions.push(pt)
  }

  return suggestions
}

export function getReference(protocolId: string, fieldName: string): StagingReference | null {
  // pM is universal
  if (fieldName === 'pm_stage') return pmTable

  if (protocolId === 'melanoma') {
    if (fieldName === 'pt_stage') return melanomaPtTable
    if (fieldName === 'pn_stage') return melanomaPnTable
  }
  if (protocolId === 'colon-resection') {
    if (fieldName === 'pt_stage') return colonPtTable
    if (fieldName === 'pn_stage') return colonPnTable
  }
  return null
}

export function getMatchingStage(reference: StagingReference, suggestion: StagingSuggestion | undefined): string | null {
  if (!suggestion) return null
  return suggestion.value || null
}
