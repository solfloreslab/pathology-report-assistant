import type { FormValues, } from '../hooks/useFormState'
import type { ProtocolDef, FieldDef } from './protocols'
import type { Lang } from './i18n'

function label(f: FieldDef, lang: Lang): string {
  return lang === 'es' ? f.label_es : f.label_en
}

function val(values: FormValues, name: string): string | null {
  const v = values[name]
  if (!v || v === '' || v === '—') return null
  return v
}

// Translate dropdown value to display label in the correct language
function displayVal(protocol: ProtocolDef, values: FormValues, name: string, lang: Lang): string | null {
  const v = val(values, name)
  if (!v) return null
  const field = protocol.fields.find(f => f.name === name)
  if (field?.options) {
    const opt = field.options.find(o => o.value === v)
    if (opt) return lang === 'es' ? opt.label_es : opt.label_en
  }
  return v
}

function tristateText(v: string | null, lang: Lang): string | null {
  if (!v) return null
  if (v === 'present') return lang === 'es' ? 'presente' : 'present'
  if (v === 'absent') return lang === 'es' ? 'ausente' : 'absent'
  if (v === 'ne') return lang === 'es' ? 'no evaluado/a' : 'not evaluated'
  return v
}

export function generateReport(protocol: ProtocolDef, values: FormValues, lang: Lang, includeMacro: boolean): string {
  const lines: string[] = []
  const hasAny = protocol.fields.some(f => val(values, f.name))
  if (!hasAny) return ''

  if (lang === 'es') {
    lines.push('INFORME DE ANATOMÍA PATOLÓGICA')
  } else {
    lines.push('PATHOLOGY REPORT')
  }
  lines.push('')

  if (includeMacro) {
    lines.push(lang === 'es' ? 'DESCRIPCIÓN MACROSCÓPICA:' : 'GROSS DESCRIPTION:')
    const proc = displayVal(protocol, values, 'procedure_type', lang)
    const loc = displayVal(protocol, values, 'tumor_location', lang)
    const size = val(values, 'tumor_size')
    const macroparts: string[] = []
    if (proc) macroparts.push(lang === 'es' ? `Se recibe espécimen de ${proc.toLowerCase()}` : `Specimen received from ${proc.toLowerCase()}`)
    if (loc) macroparts.push(lang === 'es' ? `localizado en ${loc.toLowerCase()}` : `located in ${loc.toLowerCase()}`)
    if (size) macroparts.push(lang === 'es' ? `Tamaño tumoral: ${size}` : `Tumor size: ${size}`)
    if (macroparts.length > 0) {
      lines.push(macroparts.join('. ') + '.')
    }
    lines.push('')
  }

  // Microscopic
  lines.push(lang === 'es' ? 'DESCRIPCIÓN MICROSCÓPICA:' : 'MICROSCOPIC DESCRIPTION:')
  const microParts: string[] = []

  const histType = displayVal(protocol, values, 'histologic_type', lang)
  const histGrade = displayVal(protocol, values, 'histologic_grade', lang)
  const depth = displayVal(protocol, values, 'depth_of_invasion', lang)
  const breslow = val(values, 'breslow_thickness')

  if (histType) {
    let desc = histType
    if (histGrade) desc += `, ${histGrade.toLowerCase()}`
    microParts.push(desc)
  }

  if (depth) microParts.push(lang === 'es' ? `Profundidad de invasión: ${depth}` : `Depth of invasion: ${depth}`)
  if (breslow) microParts.push(lang === 'es' ? `Espesor de Breslow: ${breslow}` : `Breslow thickness: ${breslow}`)

  const ulceration = tristateText(val(values, 'ulceration'), lang)
  if (ulceration) microParts.push(lang === 'es' ? `Ulceración: ${ulceration}` : `Ulceration: ${ulceration}`)

  const mitotic = val(values, 'mitotic_index')
  if (mitotic) microParts.push(lang === 'es' ? `Índice mitótico: ${mitotic}` : `Mitotic index: ${mitotic}`)

  const clark = val(values, 'clark_level')
  if (clark) microParts.push(lang === 'es' ? `Nivel de Clark: ${clark}` : `Clark level: ${clark}`)

  const lvi = tristateText(val(values, 'lymphovascular_invasion'), lang)
  if (lvi) microParts.push(lang === 'es' ? `Invasión linfovascular: ${lvi}` : `Lymphovascular invasion: ${lvi}`)

  const pni = tristateText(val(values, 'perineural_invasion'), lang)
  if (pni) microParts.push(lang === 'es' ? `Invasión perineural: ${pni}` : `Perineural invasion: ${pni}`)

  const neuro = tristateText(val(values, 'neurotropism'), lang)
  if (neuro) microParts.push(lang === 'es' ? `Neurotropismo: ${neuro}` : `Neurotropism: ${neuro}`)

  const microsat = tristateText(val(values, 'microsatellitosis'), lang)
  if (microsat) microParts.push(lang === 'es' ? `Microsatelitosis: ${microsat}` : `Microsatellitosis: ${microsat}`)

  const lnExam = val(values, 'lymph_nodes_examined')
  const lnPos = val(values, 'lymph_nodes_positive')
  if (lnExam) {
    const lnText = lnPos
      ? (lang === 'es' ? `Ganglios linfáticos: ${lnPos} positivos de ${lnExam} examinados` : `Lymph nodes: ${lnPos} positive of ${lnExam} examined`)
      : (lang === 'es' ? `Ganglios linfáticos examinados: ${lnExam}` : `Lymph nodes examined: ${lnExam}`)
    microParts.push(lnText)
  }

  const extranodal = tristateText(val(values, 'extranodal_extension'), lang)
  if (extranodal) microParts.push(lang === 'es' ? `Extensión extranodal: ${extranodal}` : `Extranodal extension: ${extranodal}`)

  // Margins
  const marginFields = ['margins', 'margins_proximal', 'margins_distal', 'margins_radial', 'lateral_margin', 'deep_margin']
  const marginParts: string[] = []
  for (const mf of marginFields) {
    const mv = val(values, mf)
    if (mv) {
      const field = protocol.fields.find(f => f.name === mf)
      if (field) marginParts.push(`${label(field, lang)}: ${mv}`)
    }
  }
  if (marginParts.length > 0) {
    microParts.push((lang === 'es' ? 'Márgenes: ' : 'Margins: ') + marginParts.join('; '))
  }

  const perforation = tristateText(val(values, 'tumor_perforation'), lang)
  if (perforation) microParts.push(lang === 'es' ? `Perforación tumoral: ${perforation}` : `Tumor perforation: ${perforation}`)

  const deposits = tristateText(val(values, 'tumor_deposits'), lang)
  if (deposits) microParts.push(lang === 'es' ? `Depósitos tumorales: ${deposits}` : `Tumor deposits: ${deposits}`)

  if (microParts.length > 0) {
    lines.push(microParts.join('. ') + '.')
  }
  lines.push('')

  // Biomarkers
  const biomarkerFields = ['er_status', 'pr_status', 'her2_status', 'ki67', 'mmr_msi', 'msi_mmr', 'pdl1_cps', 'hpv_status']
  const biomarkerParts: string[] = []
  for (const bf of biomarkerFields) {
    const bv = displayVal(protocol, values, bf, lang) || val(values, bf)
    if (bv) {
      const field = protocol.fields.find(f => f.name === bf)
      if (field) biomarkerParts.push(`${label(field, lang)}: ${bv}`)
    }
  }
  if (biomarkerParts.length > 0) {
    lines.push(lang === 'es' ? 'ESTUDIOS COMPLEMENTARIOS:' : 'ANCILLARY STUDIES:')
    lines.push(biomarkerParts.join('. ') + '.')
    lines.push('')
  }

  // Diagnosis
  lines.push(lang === 'es' ? 'DIAGNÓSTICO:' : 'DIAGNOSIS:')
  const diagParts: string[] = []
  const loc = displayVal(protocol, values, 'tumor_location', lang)
  if (loc) diagParts.push(loc)
  if (histType) diagParts.push(histType)
  if (histGrade) diagParts.push(histGrade)

  const ptnm = val(values, 'pTNM') || val(values, 'pt_stage')
  if (ptnm) diagParts.push(ptnm)

  if (diagParts.length > 0) {
    lines.push(diagParts.join(', ') + '.')
  }

  if (lnExam && lnPos) {
    lines.push(lang === 'es'
      ? `Ganglios linfáticos: ${lnPos}/${lnExam} positivos.`
      : `Lymph nodes: ${lnPos}/${lnExam} positive.`)
  }

  if (marginParts.length > 0) {
    lines.push((lang === 'es' ? 'Márgenes: ' : 'Margins: ') + marginParts.join('; ') + '.')
  }

  // Associated findings
  const assoc = val(values, 'associated_findings') || val(values, 'recommendations') || val(values, 'organisms')
  if (assoc) {
    lines.push('')
    lines.push(lang === 'es' ? 'HALLAZGOS ADICIONALES:' : 'ADDITIONAL FINDINGS:')
    lines.push(assoc)
  }

  // Specimen adequacy (cytology)
  const adequacy = val(values, 'specimen_adequacy')
  if (adequacy) {
    const tz = tristateText(val(values, 'transformation_zone'), lang)
    const adequacyLine = lang === 'es'
      ? `Adecuación de la muestra: ${adequacy}`
      : `Specimen adequacy: ${adequacy}`
    lines.splice(2, 0, adequacyLine + (tz ? `. ${lang === 'es' ? 'Zona de transformación' : 'Transformation zone'}: ${tz}` : '') + '.', '')
  }

  const epithelial = val(values, 'epithelial_abnormality')
  if (epithelial) {
    // For cytology, replace diagnosis
    const idx = lines.indexOf(lang === 'es' ? 'DIAGNÓSTICO:' : 'DIAGNOSIS:')
    if (idx >= 0) {
      lines[idx + 1] = lang === 'es'
        ? `Interpretación: ${epithelial}.`
        : `Interpretation: ${epithelial}.`
    }
  }

  // Regression (melanoma)
  const regression = tristateText(val(values, 'regression'), lang)
  if (regression) {
    const lastMicro = lines.findIndex(l => l.startsWith(lang === 'es' ? 'DIAGNÓSTICO' : 'DIAGNOSIS'))
    if (lastMicro > 0) lines.splice(lastMicro, 0, (lang === 'es' ? `Regresión: ${regression}.` : `Regression: ${regression}.`), '')
  }

  return lines.join('\n')
}
