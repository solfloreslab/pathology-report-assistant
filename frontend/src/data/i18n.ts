export type Lang = 'es' | 'en'

const translations = {
  // Header
  'app.title': { es: 'Asistente de Informes de Patología', en: 'Pathology Report Assistant' },
  'app.subtitle': { es: 'Generación y validación de informes según protocolos CAP/ICCR', en: 'Report generation and validation following CAP/ICCR protocols' },

  // Tabs
  'tab.copilot': { es: 'Copiloto', en: 'Copilot' },
  'tab.auditor': { es: 'Auditor', en: 'Auditor' },

  // Protocol search
  'protocol.search': { es: 'Buscar protocolo...', en: 'Search protocol...' },
  'protocol.select': { es: 'Seleccionar protocolo', en: 'Select protocol' },
  'protocol.coming': { es: 'Próximamente', en: 'Coming soon' },

  // Form
  'form.section.specimen': { es: 'Espécimen', en: 'Specimen' },
  'form.section.tumor': { es: 'Tumor', en: 'Tumor' },
  'form.section.staging': { es: 'Estadificación y márgenes', en: 'Staging & margins' },
  'form.section.invasion': { es: 'Invasión', en: 'Invasion' },
  'form.section.lymphnodes': { es: 'Ganglios linfáticos', en: 'Lymph nodes' },
  'form.section.margins': { es: 'Márgenes', en: 'Margins' },
  'form.section.biomarkers': { es: 'Biomarcadores', en: 'Biomarkers' },
  'form.section.additional': { es: 'Hallazgos adicionales', en: 'Additional findings' },
  'form.include_macro': { es: 'Incluir descripción macroscópica', en: 'Include macroscopic description' },

  // Tri-state
  'tristate.present': { es: 'Presente', en: 'Present' },
  'tristate.absent': { es: 'Ausente', en: 'Absent' },
  'tristate.ne': { es: 'No evaluado', en: 'Not evaluated' },

  // Quick notes
  'notes.title': { es: 'Notas rápidas (opcional)', en: 'Quick notes (optional)' },
  'notes.placeholder': { es: 'ej: sigmoide adeno mod G2 s/perineural 2/18 gang marg 3cm ILV+ MMR conservado', en: 'e.g.: sigmoid adeno mod G2 no perineural 2/18 nodes margin 3cm LVI+ MMR proficient' },
  'notes.prefill': { es: 'Pre-llenar con IA', en: 'Pre-fill with AI' },
  'notes.processing': { es: 'Procesando con IA...', en: 'Processing with AI...' },

  // Report
  'report.title': { es: 'Informe', en: 'Report' },
  'report.draft': { es: 'BORRADOR — Requiere revisión del patólogo', en: 'DRAFT — Requires pathologist review' },
  'report.copy': { es: 'Copiar', en: 'Copy' },
  'report.copied': { es: 'Copiado', en: 'Copied' },
  'report.empty': { es: 'Rellene campos para generar el informe', en: 'Fill in fields to generate the report' },
  'report.review': { es: 'Revisar con IA', en: 'Review with AI' },
  'report.reviewing': { es: 'Revisando...', en: 'Reviewing...' },

  // Completion
  'completion.title': { es: 'Completitud', en: 'Completeness' },
  'completion.completed': { es: 'completados', en: 'completed' },
  'completion.pending': { es: 'pendientes', en: 'pending' },
  'completion.go_incomplete': { es: 'Ir a campos incompletos', en: 'Go to incomplete fields' },

  // Sections status
  'status.complete': { es: 'Completo', en: 'Complete' },
  'status.partial': { es: 'parcial', en: 'partial' },
  'status.empty': { es: 'No iniciado', en: 'Not started' },
  'status.errors': { es: 'errores', en: 'errors' },

  // Severity
  'severity.critical': { es: 'Crítico', en: 'Critical' },
  'severity.major': { es: 'Mayor', en: 'Major' },
  'severity.minor': { es: 'Menor', en: 'Minor' },

  // Access
  'access.title': { es: 'Código de acceso', en: 'Access code' },
  'access.placeholder': { es: 'Ingrese el código de acceso', en: 'Enter access code' },
  'access.submit': { es: 'Entrar', en: 'Enter' },
  'access.error': { es: 'Código incorrecto', en: 'Incorrect code' },

  // Footer
  'footer.disclaimer': { es: 'No es un dispositivo médico — solo para demostración', en: 'Not a medical device — for demonstration only' },
  'footer.synthetic': { es: 'Todos los datos son sintéticos', en: 'All data is synthetic' },
  'footer.built': { es: 'Desarrollado por solfloreslab', en: 'Built by solfloreslab' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key
}
