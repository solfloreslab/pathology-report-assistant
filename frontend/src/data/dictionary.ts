// Real-time text parser — maps abbreviations/keywords to form field values
// This is the "dictionary" that converts free text to structured data instantly
// In v2, this would be configurable per pathologist

export interface DictMatch {
  field: string
  value: string
}

interface DictRule {
  patterns: RegExp[]
  field: string
  value: string | ((match: RegExpMatchArray) => string)
}

// ─── COLON DICTIONARY ───

const colonRules: DictRule[] = [
  // Histologic type
  { patterns: [/\badeno\b/i, /\badenocarcinoma\b/i], field: 'histologic_type', value: 'adenocarcinoma' },
  { patterns: [/\bmucino/i], field: 'histologic_type', value: 'mucinous' },
  { patterns: [/\bserrad/i, /\bserrat/i], field: 'histologic_type', value: 'serrated' },
  { patterns: [/\banillo.*sello/i, /\bsignet/i], field: 'histologic_type', value: 'signet_ring' },

  // Grade
  { patterns: [/\bG1\b/i, /\bbien\s*dif/i, /\bwell\s*diff/i], field: 'histologic_grade', value: 'G1' },
  { patterns: [/\bG2\b/i, /\bmod\b/i, /\bmoder/i], field: 'histologic_grade', value: 'G2' },
  { patterns: [/\bG3\b/i, /\bpobre/i, /\bpoorly/i], field: 'histologic_grade', value: 'G3' },

  // Depth
  { patterns: [/\bsubmuc/i], field: 'depth_of_invasion', value: 'submucosa' },
  { patterns: [/\bmusc.*prop/i, /\bmuscular\b/i], field: 'depth_of_invasion', value: 'muscularis_propria' },
  { patterns: [/\bpericol/i, /\bsubser/i], field: 'depth_of_invasion', value: 'pericolorectal' },
  { patterns: [/\bseros/i], field: 'depth_of_invasion', value: 'serosa' },

  // Location
  { patterns: [/\bsigmoid/i], field: 'tumor_location', value: 'sigmoid' },
  { patterns: [/\bciego\b/i, /\bcecum\b/i, /\bcec\b/i], field: 'tumor_location', value: 'cecum' },
  { patterns: [/\bascend/i], field: 'tumor_location', value: 'ascending' },
  { patterns: [/\bdescend/i], field: 'tumor_location', value: 'descending' },
  { patterns: [/\btransvers/i], field: 'tumor_location', value: 'transverse' },
  { patterns: [/\brecto\b/i, /\brectal\b/i, /\brectum\b/i], field: 'tumor_location', value: 'rectum' },

  // Lymph nodes: "2/18", "2.18", "2-18", "2 de 18", "2 of 18", "2/18 gang"
  { patterns: [/(\d+)\s*[\/\.\-de]+\s*(\d+)\s*gang/i, /(\d+)\s*[\/\.\-de]+\s*(\d+)\s*node/i, /(\d+)\s*[\/\.\-de]+\s*(\d+)\s*ln/i, /(\d+)\s*[\/\.\-]+\s*(\d+)/],
    field: 'lymph_nodes_positive',
    value: (m: RegExpMatchArray) => m[1] },
  { patterns: [/(\d+)\s*[\/\.\-de]+\s*(\d+)\s*gang/i, /(\d+)\s*[\/\.\-de]+\s*(\d+)\s*node/i, /(\d+)\s*[\/\.\-de]+\s*(\d+)\s*ln/i, /(\d+)\s*[\/\.\-]+\s*(\d+)/],
    field: 'lymph_nodes_examined',
    value: (m: RegExpMatchArray) => m[2] },

  // Invasion
  { patterns: [/\bILV\+/i, /\bLVI\+/i, /\binv.*linf.*pres/i], field: 'lymphovascular_invasion', value: 'present' },
  { patterns: [/\bILV-/i, /\bLVI-/i, /\bs\/ILV/i, /\bs\/LVI/i, /\binv.*linf.*aus/i], field: 'lymphovascular_invasion', value: 'absent' },
  { patterns: [/\bPNI\+/i, /\bperineural\+/i, /\binv.*peri.*pres/i], field: 'perineural_invasion', value: 'present' },
  { patterns: [/\bPNI-/i, /\bs\/PNI/i, /\bs\/perineural/i, /\binv.*peri.*aus/i], field: 'perineural_invasion', value: 'absent' },

  // Margins
  { patterns: [/\bmarg.*(\d+)\s*cm/i, /\bmarg.*libr.*(\d+)/i], field: 'margins_distal', value: (m: RegExpMatchArray) => `${m[1]} cm` },

  // MMR/MSI
  { patterns: [/\bMMR\s*conserv/i, /\bpMMR\b/i, /\bMSS\b/i, /\bMMR\s*ok/i], field: 'mmr_msi', value: 'pMMR' },
  { patterns: [/\bdMMR\b/i, /\bMSI-?H\b/i, /\bMMR\s*def/i], field: 'mmr_msi', value: 'dMMR' },
  { patterns: [/\bMMR\s*pend/i], field: 'mmr_msi', value: 'pending' },

  // Procedure
  { patterns: [/\bhemicol.*der/i, /\bright.*hemi/i], field: 'procedure_type', value: 'right_hemicolectomy' },
  { patterns: [/\bhemicol.*izq/i, /\bleft.*hemi/i], field: 'procedure_type', value: 'left_hemicolectomy' },
  { patterns: [/\bsigmoid.*ectom/i], field: 'procedure_type', value: 'sigmoidectomy' },
  { patterns: [/\bcolect.*total/i], field: 'procedure_type', value: 'total_colectomy' },
]

// ─── MELANOMA DICTIONARY ───

const melanomaRules: DictRule[] = [
  // Type
  { patterns: [/\bMES\b/i, /\bextens.*superf/i], field: 'histologic_type', value: 'superficial_spreading' },
  { patterns: [/\bnodular\b/i], field: 'histologic_type', value: 'nodular' },
  { patterns: [/\blentigo\b/i, /\bLM\b/], field: 'histologic_type', value: 'lentigo_maligna' },
  { patterns: [/\bacral\b/i], field: 'histologic_type', value: 'acral' },
  { patterns: [/\bdesmoplás/i, /\bdesmoplast/i], field: 'histologic_type', value: 'desmoplastic' },

  // Breslow
  { patterns: [/[Bb]reslow\s*(\d+[\.,]?\d*)/], field: 'breslow_thickness', value: (m: RegExpMatchArray) => m[1].replace(',', '.') },
  { patterns: [/(\d+[\.,]?\d*)\s*mm\b/], field: 'breslow_thickness', value: (m: RegExpMatchArray) => m[1].replace(',', '.') },

  // Ulceration
  { patterns: [/\bulcerad[oa]\b/i, /\bulcerat/i, /\bulc\+/i], field: 'ulceration', value: 'present' },
  { patterns: [/\bs\/ulc/i, /\bno\s*ulc/i, /\bulc-/i, /\bsin\s*ulc/i], field: 'ulceration', value: 'absent' },

  // Mitotic
  { patterns: [/(\d+)\s*mit/i], field: 'mitotic_index', value: (m: RegExpMatchArray) => m[1] },

  // Clark
  { patterns: [/[Cc]lark\s*(I{1,3}V?|IV|V)\b/], field: 'clark_level', value: (m: RegExpMatchArray) => m[1] },

  // Margins
  { patterns: [/\b(?:borde|marg).*lat.*(\d+)/i, /\blat\s*(\d+)/i], field: 'lateral_margin', value: (m: RegExpMatchArray) => m[1] },
  { patterns: [/\b(?:borde|marg).*prof.*(\d+)/i, /\bprof\s*(\d+)/i], field: 'deep_margin', value: (m: RegExpMatchArray) => m[1] },

  // Invasion
  { patterns: [/\bILV\+/i, /\bLVI\+/i], field: 'lymphovascular_invasion', value: 'present' },
  { patterns: [/\bs\/ILV/i, /\bs\/LVI/i, /\bILV-/i], field: 'lymphovascular_invasion', value: 'absent' },
  { patterns: [/\bneurotrop.*pres/i, /\bneurotrop\+/i], field: 'neurotropism', value: 'present' },
  { patterns: [/\bs\/neurotrop/i, /\bneurotrop.*aus/i, /\bneurotrop-/i], field: 'neurotropism', value: 'absent' },
  { patterns: [/\bs\/sateli/i, /\bsatelit.*aus/i], field: 'microsatellitosis', value: 'absent' },
  { patterns: [/\bsatelit.*pres/i, /\bsatelit\+/i], field: 'microsatellitosis', value: 'present' },
]

// ─── PROTOCOL MAP ───

const dictionaries: Record<string, DictRule[]> = {
  'colon-resection': colonRules,
  'melanoma': melanomaRules,
}

// ─── PARSER ───

export function parseNotes(protocolId: string, text: string): DictMatch[] {
  const rules = dictionaries[protocolId]
  if (!rules) return []

  const matches: DictMatch[] = []
  const matchedFields = new Set<string>()

  // Custom rules from localStorage (user's personal dictionary) — checked FIRST
  try {
    const customRules = JSON.parse(localStorage.getItem('patho-custom-dictionary') || '[]') as { abbreviation: string; field: string; value: string }[]
    for (const cr of customRules) {
      if (matchedFields.has(cr.field)) continue
      const regex = new RegExp(`\\b${cr.abbreviation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(text)) {
        matches.push({ field: cr.field, value: cr.value })
        matchedFields.add(cr.field)
      }
    }
  } catch { /* ignore */ }

  // Built-in rules
  for (const rule of rules) {
    if (matchedFields.has(rule.field)) continue

    for (const pattern of rule.patterns) {
      const match = text.match(pattern)
      if (match) {
        const value = typeof rule.value === 'function' ? rule.value(match) : rule.value
        matches.push({ field: rule.field, value })
        matchedFields.add(rule.field)
        break
      }
    }
  }

  return matches
}
