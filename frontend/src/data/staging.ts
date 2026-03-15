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

  const mapping: Record<string, string> = {
    'submucosa': 'pT1',
    'muscularis_propria': 'pT2',
    'pericolorectal': 'pT3',
    'serosa': 'pT4a',
    'adjacent_organs': 'pT4b',
  }

  const stage = mapping[depth]
  if (!stage) return null

  const depthLabels: Record<string, [string, string]> = {
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
