export type FieldType = 'dropdown' | 'text' | 'number' | 'tristate' | 'chips'
export type Severity = 'critical' | 'major' | 'minor'

export interface DropdownOption {
  value: string
  label_en: string
  label_es: string
}

export interface FieldDef {
  name: string
  label_en: string
  label_es: string
  section: string
  severity: Severity
  type: FieldType
  options?: DropdownOption[]
  unit?: string
  group?: string
}

export interface ProtocolDef {
  id: string
  name_en: string
  name_es: string
  version: string
  organ_en: string
  organ_es: string
  available: boolean
  fields: FieldDef[]
  rules: { condition: string; check: string; severity: Severity; message_en: string; message_es: string }[]
}

function opts(pairs: [string, string, string][]): DropdownOption[] {
  return pairs.map(([value, label_en, label_es]) => ({ value, label_en, label_es }))
}

export const protocols: ProtocolDef[] = [
  {
    id: 'colon-resection',
    name_en: 'Colon/Rectum Resection',
    name_es: 'Resección de colon/recto',
    version: 'CAP 4.2.0.0 / ICCR 2020',
    organ_en: 'Colon',
    organ_es: 'Colon',
    available: true,
    fields: [
      { name: 'procedure_type', label_en: 'Procedure type', label_es: 'Tipo de procedimiento', section: 'specimen', severity: 'critical', type: 'dropdown', options: opts([
        ['right_hemi', 'Right hemicolectomy', 'Hemicolectomía derecha'],
        ['left_hemi', 'Left hemicolectomy', 'Hemicolectomía izquierda'],
        ['sigmoid', 'Sigmoid colectomy', 'Colectomía sigmoidea'],
        ['lar', 'Low anterior resection', 'Resección anterior baja'],
        ['apr', 'Abdominoperineal resection', 'Resección abdominoperineal'],
        ['total', 'Total colectomy', 'Colectomía total'],
        ['segmental', 'Segmental resection', 'Resección segmentaria'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'tumor_location', label_en: 'Tumor location', label_es: 'Localización tumoral', section: 'specimen', severity: 'major', type: 'dropdown', options: opts([
        ['cecum', 'Cecum', 'Ciego'],
        ['ascending', 'Ascending colon', 'Colon ascendente'],
        ['hepatic', 'Hepatic flexure', 'Ángulo hepático'],
        ['transverse', 'Transverse colon', 'Colon transverso'],
        ['splenic', 'Splenic flexure', 'Ángulo esplénico'],
        ['descending', 'Descending colon', 'Colon descendente'],
        ['sigmoid', 'Sigmoid colon', 'Colon sigmoide'],
        ['rectosigmoid', 'Rectosigmoid junction', 'Unión rectosigmoidea'],
        ['rectum', 'Rectum', 'Recto'],
      ])},
      { name: 'tumor_size', label_en: 'Tumor size', label_es: 'Tamaño tumoral', section: 'specimen', severity: 'minor', type: 'text', unit: 'cm' },

      { name: 'histologic_type', label_en: 'Histologic type', label_es: 'Tipo histológico', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['adeno_nos', 'Adenocarcinoma NOS', 'Adenocarcinoma NOS'],
        ['mucinous', 'Mucinous adenocarcinoma', 'Adenocarcinoma mucinoso'],
        ['signet', 'Signet ring cell carcinoma', 'Carcinoma en anillo de sello'],
        ['medullary', 'Medullary carcinoma', 'Carcinoma medular'],
        ['micropapillary', 'Micropapillary carcinoma', 'Carcinoma micropapilar'],
        ['serrated', 'Serrated adenocarcinoma', 'Adenocarcinoma serrado'],
        ['undiff', 'Undifferentiated carcinoma', 'Carcinoma indiferenciado'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'histologic_grade', label_en: 'Histologic grade', label_es: 'Grado histológico', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['G1', 'G1 — Well differentiated', 'G1 — Bien diferenciado'],
        ['G2', 'G2 — Moderately differentiated', 'G2 — Moderadamente diferenciado'],
        ['G3', 'G3 — Poorly differentiated', 'G3 — Pobremente diferenciado'],
        ['GX', 'GX — Cannot be assessed', 'GX — No evaluable'],
      ])},
      { name: 'depth_of_invasion', label_en: 'Depth of invasion', label_es: 'Profundidad de invasión', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['pTis', 'Mucosa (pTis)', 'Mucosa (pTis)'],
        ['pT1', 'Submucosa (pT1)', 'Submucosa (pT1)'],
        ['pT2', 'Muscularis propria (pT2)', 'Muscular propia (pT2)'],
        ['pT3', 'Subserosa (pT3)', 'Subserosa (pT3)'],
        ['pT4a', 'Serosa/visceral peritoneum (pT4a)', 'Serosa/peritoneo visceral (pT4a)'],
        ['pT4b', 'Adjacent organs (pT4b)', 'Órganos adyacentes (pT4b)'],
      ])},

      { name: 'lymph_nodes_examined', label_en: 'Lymph nodes examined', label_es: 'Ganglios examinados', section: 'lymphnodes', severity: 'critical', type: 'number', group: 'ln' },
      { name: 'lymph_nodes_positive', label_en: 'Lymph nodes positive', label_es: 'Ganglios positivos', section: 'lymphnodes', severity: 'critical', type: 'number', group: 'ln' },
      { name: 'extranodal_extension', label_en: 'Extranodal extension', label_es: 'Extensión extranodal', section: 'lymphnodes', severity: 'minor', type: 'tristate' },

      { name: 'margins_proximal', label_en: 'Proximal margin', label_es: 'Margen proximal', section: 'margins', severity: 'major', type: 'text', group: 'mg1' },
      { name: 'margins_distal', label_en: 'Distal margin', label_es: 'Margen distal', section: 'margins', severity: 'major', type: 'text', group: 'mg1' },
      { name: 'margins_radial', label_en: 'Radial margin', label_es: 'Margen radial', section: 'margins', severity: 'major', type: 'text' },

      { name: 'lymphovascular_invasion', label_en: 'Lymphovascular invasion', label_es: 'Invasión linfovascular', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv' },
      { name: 'perineural_invasion', label_en: 'Perineural invasion', label_es: 'Invasión perineural', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv' },
      { name: 'tumor_perforation', label_en: 'Tumor perforation', label_es: 'Perforación tumoral', section: 'invasion', severity: 'minor', type: 'tristate', group: 'inv2' },
      { name: 'tumor_deposits', label_en: 'Tumor deposits', label_es: 'Depósitos tumorales', section: 'invasion', severity: 'minor', type: 'tristate', group: 'inv2' },

      { name: 'pTNM', label_en: 'pTNM staging', label_es: 'Estadificación pTNM', section: 'staging', severity: 'critical', type: 'text' },

      { name: 'mmr_msi', label_en: 'MMR/MSI status', label_es: 'Estado MMR/MSI', section: 'biomarkers', severity: 'major', type: 'dropdown', options: opts([
        ['pMMR', 'Proficient (pMMR/MSS)', 'Conservado (pMMR/MSS)'],
        ['dMMR', 'Deficient (dMMR/MSI-H)', 'Deficiente (dMMR/MSI-H)'],
        ['pending', 'Pending', 'Pendiente'],
        ['not_done', 'Not performed', 'No realizado'],
      ])},

      { name: 'associated_findings', label_en: 'Associated findings', label_es: 'Hallazgos asociados', section: 'additional', severity: 'minor', type: 'text' },
    ],
    rules: [
      { condition: 'pT3+', check: 'ln >= 12', severity: 'critical', message_en: 'For pT3/pT4, minimum 12 lymph nodes should be examined (NCCN)', message_es: 'En tumores pT3/pT4, se deben examinar mínimo 12 ganglios (NCCN)' },
    ],
  },
  {
    id: 'melanoma',
    name_en: 'Cutaneous Melanoma',
    name_es: 'Melanoma cutáneo',
    version: 'CAP 4.5.0.0 / ICCR 2020',
    organ_en: 'Skin',
    organ_es: 'Piel',
    available: true,
    fields: [
      { name: 'histologic_type', label_en: 'Histologic type', label_es: 'Tipo histológico', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['ssm', 'Superficial spreading', 'Extensión superficial'],
        ['nodular', 'Nodular', 'Nodular'],
        ['lmm', 'Lentigo maligna', 'Lentigo maligno'],
        ['acral', 'Acral lentiginous', 'Acral lentiginoso'],
        ['desmoplastic', 'Desmoplastic', 'Desmoplásico'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'breslow_thickness', label_en: 'Breslow thickness', label_es: 'Espesor de Breslow', section: 'tumor', severity: 'critical', type: 'text', unit: 'mm' },
      { name: 'ulceration', label_en: 'Ulceration', label_es: 'Ulceración', section: 'tumor', severity: 'critical', type: 'tristate' },
      { name: 'mitotic_index', label_en: 'Mitotic index', label_es: 'Índice mitótico', section: 'tumor', severity: 'critical', type: 'text', unit: 'mit/mm²' },
      { name: 'clark_level', label_en: 'Clark level', label_es: 'Nivel de Clark', section: 'tumor', severity: 'major', type: 'dropdown', options: opts([
        ['I', 'I', 'I'], ['II', 'II', 'II'], ['III', 'III', 'III'], ['IV', 'IV', 'IV'], ['V', 'V', 'V'],
      ])},
      { name: 'lateral_margin', label_en: 'Lateral margin', label_es: 'Margen lateral', section: 'margins', severity: 'critical', type: 'text', unit: 'mm', group: 'mg_mel' },
      { name: 'deep_margin', label_en: 'Deep margin', label_es: 'Margen profundo', section: 'margins', severity: 'critical', type: 'text', unit: 'mm', group: 'mg_mel' },
      { name: 'lymphovascular_invasion', label_en: 'Lymphovascular invasion', label_es: 'Invasión linfovascular', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv_m' },
      { name: 'neurotropism', label_en: 'Neurotropism', label_es: 'Neurotropismo', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv_m' },
      { name: 'microsatellitosis', label_en: 'Microsatellitosis', label_es: 'Microsatelitosis', section: 'invasion', severity: 'major', type: 'tristate' },
      { name: 'pT_stage', label_en: 'pT stage', label_es: 'Estadio pT', section: 'staging', severity: 'critical', type: 'text' },
      { name: 'regression', label_en: 'Regression', label_es: 'Regresión', section: 'additional', severity: 'minor', type: 'tristate' },
      { name: 'til_status', label_en: 'TIL status', label_es: 'Estado TIL', section: 'additional', severity: 'minor', type: 'dropdown', options: opts([
        ['brisk', 'Brisk', 'Intenso'], ['nonbrisk', 'Non-brisk', 'No intenso'], ['absent', 'Absent', 'Ausente'],
      ])},
    ],
    rules: [],
  },
  {
    id: 'breast-biopsy',
    name_en: 'Breast Biopsy / Resection',
    name_es: 'Biopsia / Resección de mama',
    version: 'CAP 4.8.0.0 / ICCR 2020',
    organ_en: 'Breast',
    organ_es: 'Mama',
    available: true,
    fields: [
      { name: 'procedure_type', label_en: 'Procedure type', label_es: 'Tipo de procedimiento', section: 'specimen', severity: 'critical', type: 'dropdown', options: opts([
        ['cnb', 'Core needle biopsy', 'Biopsia con aguja gruesa (BAG)'],
        ['excision', 'Excisional biopsy', 'Biopsia escisional'],
        ['lumpectomy', 'Lumpectomy', 'Tumorectomía'],
        ['mastectomy', 'Mastectomy', 'Mastectomía'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'laterality', label_en: 'Laterality', label_es: 'Lateralidad', section: 'specimen', severity: 'major', type: 'dropdown', options: opts([
        ['right', 'Right', 'Derecha'], ['left', 'Left', 'Izquierda'], ['bilateral', 'Bilateral', 'Bilateral'],
      ])},
      { name: 'histologic_type', label_en: 'Histologic type', label_es: 'Tipo histológico', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['idc', 'Invasive ductal carcinoma NOS', 'Carcinoma ductal infiltrante NOS'],
        ['ilc', 'Invasive lobular carcinoma', 'Carcinoma lobulillar infiltrante'],
        ['mucinous', 'Mucinous carcinoma', 'Carcinoma mucinoso'],
        ['tubular', 'Tubular carcinoma', 'Carcinoma tubular'],
        ['dcis', 'DCIS only', 'CDIS exclusivamente'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'histologic_grade', label_en: 'Nottingham grade', label_es: 'Grado Nottingham', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['1', 'Grade 1 (3-5 points)', 'Grado 1 (3-5 puntos)'],
        ['2', 'Grade 2 (6-7 points)', 'Grado 2 (6-7 puntos)'],
        ['3', 'Grade 3 (8-9 points)', 'Grado 3 (8-9 puntos)'],
      ])},
      { name: 'tumor_size', label_en: 'Tumor size', label_es: 'Tamaño tumoral', section: 'tumor', severity: 'critical', type: 'text', unit: 'cm' },
      { name: 'lymph_nodes_examined', label_en: 'Lymph nodes examined', label_es: 'Ganglios examinados', section: 'lymphnodes', severity: 'major', type: 'number', group: 'ln_b' },
      { name: 'lymph_nodes_positive', label_en: 'Lymph nodes positive', label_es: 'Ganglios positivos', section: 'lymphnodes', severity: 'major', type: 'number', group: 'ln_b' },
      { name: 'margins', label_en: 'Margins', label_es: 'Márgenes', section: 'margins', severity: 'critical', type: 'text' },
      { name: 'lymphovascular_invasion', label_en: 'Lymphovascular invasion', label_es: 'Invasión linfovascular', section: 'invasion', severity: 'major', type: 'tristate' },
      { name: 'er_status', label_en: 'Estrogen receptor (ER)', label_es: 'Receptor de estrógeno (RE)', section: 'biomarkers', severity: 'critical', type: 'dropdown', group: 'er_pr', options: opts([
        ['positive', 'Positive', 'Positivo'], ['negative', 'Negative', 'Negativo'], ['pending', 'Pending', 'Pendiente'],
      ])},
      { name: 'pr_status', label_en: 'Progesterone receptor (PR)', label_es: 'Receptor de progesterona (RP)', section: 'biomarkers', severity: 'critical', type: 'dropdown', group: 'er_pr', options: opts([
        ['positive', 'Positive', 'Positivo'], ['negative', 'Negative', 'Negativo'], ['pending', 'Pending', 'Pendiente'],
      ])},
      { name: 'her2_status', label_en: 'HER2 status', label_es: 'Estado HER2', section: 'biomarkers', severity: 'critical', type: 'dropdown', options: opts([
        ['3+', 'Positive (3+)', 'Positivo (3+)'],
        ['2+', 'Equivocal (2+)', 'Equívoco (2+)'],
        ['0_1+', 'Negative (0/1+)', 'Negativo (0/1+)'],
        ['pending', 'Pending', 'Pendiente'],
      ])},
      { name: 'ki67', label_en: 'Ki-67 index', label_es: 'Índice Ki-67', section: 'biomarkers', severity: 'major', type: 'text', unit: '%' },
      { name: 'pTNM', label_en: 'pTNM staging', label_es: 'Estadificación pTNM', section: 'staging', severity: 'critical', type: 'text' },
    ],
    rules: [],
  },
  {
    id: 'gastric',
    name_en: 'Gastric Carcinoma',
    name_es: 'Carcinoma gástrico',
    version: 'CAP 4.2.0.0 / ICCR 2020',
    organ_en: 'Stomach',
    organ_es: 'Estómago',
    available: true,
    fields: [
      { name: 'histologic_type', label_en: 'Histologic type', label_es: 'Tipo histológico', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['tubular', 'Tubular adenocarcinoma', 'Adenocarcinoma tubular'],
        ['papillary', 'Papillary adenocarcinoma', 'Adenocarcinoma papilar'],
        ['mucinous', 'Mucinous adenocarcinoma', 'Adenocarcinoma mucinoso'],
        ['signet', 'Poorly cohesive (signet ring)', 'Pobremente cohesivo (anillo de sello)'],
        ['mixed', 'Mixed', 'Mixto'],
        ['other', 'Other', 'Otro'],
      ])},
      { name: 'histologic_grade', label_en: 'Histologic grade', label_es: 'Grado histológico', section: 'tumor', severity: 'minor', type: 'dropdown', options: opts([
        ['G1', 'G1 — Well differentiated', 'G1 — Bien diferenciado'],
        ['G2', 'G2 — Moderately differentiated', 'G2 — Moderadamente diferenciado'],
        ['G3', 'G3 — Poorly differentiated', 'G3 — Pobremente diferenciado'],
      ])},
      { name: 'depth_of_invasion', label_en: 'Depth of invasion', label_es: 'Profundidad de invasión', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['pT1a', 'Lamina propria (pT1a)', 'Lámina propia (pT1a)'],
        ['pT1b', 'Submucosa (pT1b)', 'Submucosa (pT1b)'],
        ['pT2', 'Muscularis propria (pT2)', 'Muscular propia (pT2)'],
        ['pT3', 'Subserosa (pT3)', 'Subserosa (pT3)'],
        ['pT4a', 'Serosa (pT4a)', 'Serosa (pT4a)'],
        ['pT4b', 'Adjacent structures (pT4b)', 'Estructuras adyacentes (pT4b)'],
      ])},
      { name: 'tumor_location', label_en: 'Tumor location', label_es: 'Localización tumoral', section: 'specimen', severity: 'major', type: 'dropdown', options: opts([
        ['cardia', 'Cardia/GEJ', 'Cardias/UGE'],
        ['fundus', 'Fundus', 'Fundus'],
        ['body', 'Body', 'Cuerpo'],
        ['antrum', 'Antrum', 'Antro'],
        ['pylorus', 'Pylorus', 'Píloro'],
      ])},
      { name: 'tumor_size', label_en: 'Tumor size', label_es: 'Tamaño tumoral', section: 'specimen', severity: 'minor', type: 'text', unit: 'cm' },
      { name: 'lymph_nodes_examined', label_en: 'Lymph nodes examined', label_es: 'Ganglios examinados', section: 'lymphnodes', severity: 'critical', type: 'number', group: 'ln_g' },
      { name: 'lymph_nodes_positive', label_en: 'Lymph nodes positive', label_es: 'Ganglios positivos', section: 'lymphnodes', severity: 'critical', type: 'number', group: 'ln_g' },
      { name: 'margins_proximal', label_en: 'Proximal margin', label_es: 'Margen proximal', section: 'margins', severity: 'major', type: 'text', group: 'mg_g' },
      { name: 'margins_distal', label_en: 'Distal margin', label_es: 'Margen distal', section: 'margins', severity: 'major', type: 'text', group: 'mg_g' },
      { name: 'lymphovascular_invasion', label_en: 'Lymphovascular invasion', label_es: 'Invasión linfovascular', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv_g' },
      { name: 'perineural_invasion', label_en: 'Perineural invasion', label_es: 'Invasión perineural', section: 'invasion', severity: 'major', type: 'tristate', group: 'inv_g' },
      { name: 'pTNM', label_en: 'pTNM staging', label_es: 'Estadificación pTNM', section: 'staging', severity: 'critical', type: 'text' },
      { name: 'her2_status', label_en: 'HER2 status', label_es: 'Estado HER2', section: 'biomarkers', severity: 'major', type: 'dropdown', options: opts([
        ['3+', 'Positive (3+)', 'Positivo (3+)'],
        ['2+', 'Equivocal (2+)', 'Equívoco (2+)'],
        ['0_1+', 'Negative (0/1+)', 'Negativo (0/1+)'],
        ['pending', 'Pending', 'Pendiente'],
        ['not_done', 'Not performed', 'No realizado'],
      ])},
      { name: 'msi_mmr', label_en: 'MSI/MMR status', label_es: 'Estado MSI/MMR', section: 'biomarkers', severity: 'major', type: 'dropdown', options: opts([
        ['pMMR', 'Proficient (pMMR/MSS)', 'Conservado (pMMR/MSS)'],
        ['dMMR', 'Deficient (dMMR/MSI-H)', 'Deficiente (dMMR/MSI-H)'],
        ['pending', 'Pending', 'Pendiente'],
        ['not_done', 'Not performed', 'No realizado'],
      ])},
      { name: 'pdl1_cps', label_en: 'PD-L1 CPS', label_es: 'PD-L1 CPS', section: 'biomarkers', severity: 'major', type: 'text' },
    ],
    rules: [],
  },
  {
    id: 'cytology-cervical',
    name_en: 'Cervical Cytology',
    name_es: 'Citología cervical',
    version: 'Bethesda 2014',
    organ_en: 'Cervix',
    organ_es: 'Cérvix',
    available: true,
    fields: [
      { name: 'specimen_adequacy', label_en: 'Specimen adequacy', label_es: 'Adecuación de la muestra', section: 'specimen', severity: 'critical', type: 'dropdown', options: opts([
        ['satisfactory', 'Satisfactory', 'Satisfactoria'],
        ['unsatisfactory', 'Unsatisfactory', 'Insatisfactoria'],
      ])},
      { name: 'transformation_zone', label_en: 'Transformation zone', label_es: 'Zona de transformación', section: 'specimen', severity: 'major', type: 'tristate' },
      { name: 'epithelial_abnormality', label_en: 'Epithelial abnormality', label_es: 'Anomalía epitelial', section: 'tumor', severity: 'critical', type: 'dropdown', options: opts([
        ['nilm', 'NILM', 'NILM'],
        ['ascus', 'ASC-US', 'ASC-US'],
        ['asch', 'ASC-H', 'ASC-H'],
        ['lsil', 'LSIL', 'LSIL'],
        ['hsil', 'HSIL', 'HSIL'],
        ['scc', 'SCC', 'Carcinoma escamoso'],
        ['agc', 'AGC', 'AGC'],
        ['ais', 'AIS', 'AIS'],
        ['adeno', 'Adenocarcinoma', 'Adenocarcinoma'],
      ])},
      { name: 'organisms', label_en: 'Organisms', label_es: 'Organismos', section: 'additional', severity: 'minor', type: 'text' },
      { name: 'hpv_status', label_en: 'HPV status', label_es: 'Estado VPH', section: 'biomarkers', severity: 'major', type: 'dropdown', options: opts([
        ['positive', 'Positive (high-risk)', 'Positivo (alto riesgo)'],
        ['negative', 'Negative', 'Negativo'],
        ['not_tested', 'Not tested', 'No realizado'],
        ['pending', 'Pending', 'Pendiente'],
      ])},
      { name: 'recommendations', label_en: 'Recommendations', label_es: 'Recomendaciones', section: 'additional', severity: 'minor', type: 'text' },
    ],
    rules: [],
  },
  // Placeholders
  { id: 'prostate', name_en: 'Prostate Resection', name_es: 'Resección de próstata', version: 'CAP / ICCR', organ_en: 'Prostate', organ_es: 'Próstata', available: false, fields: [], rules: [] },
  { id: 'lung', name_en: 'Lung Resection', name_es: 'Resección pulmonar', version: 'CAP / ICCR', organ_en: 'Lung', organ_es: 'Pulmón', available: false, fields: [], rules: [] },
  { id: 'thyroid', name_en: 'Thyroid Resection', name_es: 'Resección de tiroides', version: 'CAP / ICCR', organ_en: 'Thyroid', organ_es: 'Tiroides', available: false, fields: [], rules: [] },
]

export const sectionOrder = [
  'specimen', 'tumor', 'lymphnodes', 'margins', 'invasion', 'staging', 'biomarkers', 'additional'
] as const

export type SectionId = typeof sectionOrder[number]
