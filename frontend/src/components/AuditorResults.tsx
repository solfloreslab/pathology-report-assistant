import { AlertTriangle, Check, FileCode, Info } from 'lucide-react'
import type { Lang } from '../data/i18n'
import { highlightClinical } from '../data/utils'

interface AuditorValidation {
  completeness_score: number
  reported_fields: number
  total_required_fields: number
  missing_required?: { field: string; label?: string; severity: string; action?: string }[]
  inconsistencies?: { finding?: string; description?: string; severity: string; suggestion?: string }[]
  clinical_alerts?: { alert: string }[]
  suggested_coding?: {
    topography?: string
    topography_label?: string
    morphology?: string
    morphology_label?: string
  }
}

interface AuditorResultsProps {
  validation: AuditorValidation
  lang: Lang
  darkMode?: boolean
}

export function AuditorResults({ validation, lang, darkMode }: AuditorResultsProps) {
  const es = lang === 'es'
  const dm = darkMode ?? false
  const score = validation.completeness_score
  const reported = validation.reported_fields
  const total = validation.total_required_fields

  const critical = validation.missing_required?.filter(f => f.severity === 'critical') || []
  const major = validation.missing_required?.filter(f => f.severity === 'major') || []
  const minor = validation.missing_required?.filter(f => f.severity === 'minor') || []
  const inconsistencies = validation.inconsistencies || []
  const alerts = validation.clinical_alerts || []
  const coding = validation.suggested_coding

  if (total === 0) {
    return (
      <div className={`p-4 rounded-xl border text-sm ${dm ? 'bg-amber-900/30 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        {es
          ? 'No se reconoce como informe de anatomía patológica. Pegue un informe con diagnóstico histológico, tipo tumoral, estadificación, etc.'
          : 'Not recognized as a pathology report. Paste a report with histologic diagnosis, tumor type, staging, etc.'}
      </div>
    )
  }

  const isPerfect = !critical.length && !major.length && !minor.length && !inconsistencies.length && !alerts.length
  const ringColor = score >= 90 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)'
  const ringTextColor = score >= 90 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning-text)' : 'var(--color-critical)'

  const card = `rounded-xl border overflow-hidden ${dm ? 'bg-gray-900 border-gray-700' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`

  return (
    <div className="space-y-2 text-[13px]">
      {/* Row 1: Ring | Faltantes Críticos | CIE-O */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Completion ring */}
        <div className={card}>
          <div className="flex items-center gap-4 p-3">
            <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90 shrink-0">
              <circle cx="40" cy="40" r="33" fill="none" stroke={dm ? '#374151' : '#E2E5EA'} strokeWidth="7" />
              <circle cx="40" cy="40" r="33" fill="none"
                stroke={ringColor}
                strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 33}`}
                strokeDashoffset={`${2 * Math.PI * 33 * (1 - score / 100)}`}
                className="transition-all duration-700 ease-out"
              />
              <text x="40" y="40" textAnchor="middle" dominantBaseline="central"
                className="transform rotate-90 origin-center"
                fill={ringTextColor}
                fontSize="18" fontWeight="700" fontFamily="var(--font-mono)">
                {score}%
              </text>
            </svg>
            <div>
              <div className={`text-lg font-bold ${dm ? 'text-gray-200' : 'text-[var(--color-text)]'}`}>
                {reported}/{total}
              </div>
              <div className={`text-[13px] ${dm ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'}`}>
                {es ? 'campos reportados' : 'fields reported'}
              </div>
            </div>
          </div>
        </div>

        {/* Critical + Major missing fields */}
        <div className={card}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
            <AlertTriangle className={`w-4 h-4 ${critical.length > 0 ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-green-400' : 'text-green-600')}`} />
            <span className={`text-xs font-bold uppercase ${critical.length > 0 ? (dm ? 'text-red-400' : 'text-red-700') : (dm ? 'text-green-400' : 'text-green-700')}`}>
              {es ? 'Faltantes críticos' : 'Critical missing'} ({critical.length})
            </span>
          </div>
          {critical.length > 0 || major.length > 0 ? (
            <div>
              {critical.map((f, i) => (
                <div key={`c-${i}`} className={`px-3 py-2 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2 bg-red-500" />
                  <span className={dm ? 'text-red-300' : 'text-red-700'}>• {f.label || f.field}</span>
                </div>
              ))}
              {major.map((f, i) => (
                <div key={`m-${i}`} className={`px-3 py-2 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2 bg-amber-500" />
                  <span className={dm ? 'text-amber-300' : 'text-amber-700'}>• {f.label || f.field}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={`px-3 py-4 text-center font-medium ${dm ? 'text-green-400' : 'text-green-600'}`}>
              ✓ {es ? 'Sin campos críticos faltantes' : 'No critical fields missing'}
            </div>
          )}
        </div>

        {/* CIE-O Coding */}
        <div className={card}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
            <FileCode className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-[var(--color-primary)]'}`} />
            <span className={`text-xs font-bold uppercase ${dm ? 'text-emerald-400' : 'text-[var(--color-primary)]'}`}>
              CIE-O
            </span>
          </div>
          {coding?.topography || coding?.morphology ? (
            <div className="p-3 space-y-1.5">
              {coding.topography && (
                <div>
                  <span className={dm ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'}>{es ? 'Topografía' : 'Topography'}:</span>
                  <span className="ml-1 font-mono font-bold text-[var(--color-primary)]">{coding.topography}</span>
                  {coding.topography_label && <div className={`text-xs ${dm ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>{coding.topography_label}</div>}
                </div>
              )}
              {coding.morphology && (
                <div>
                  <span className={dm ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'}>{es ? 'Morfología' : 'Morphology'}:</span>
                  <span className="ml-1 font-mono font-bold text-[var(--color-primary)]">{coding.morphology}</span>
                  {coding.morphology_label && <div className={`text-xs ${dm ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>{coding.morphology_label}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className={`p-3 ${dm ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>
              {es ? 'Sin codificación disponible' : 'No coding available'}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Menores (if any) */}
      {minor.length > 0 && (
        <div className={card}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
            <Info className={`w-4 h-4 ${dm ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-xs font-bold uppercase ${dm ? 'text-gray-400' : 'text-gray-600'}`}>
              {es ? 'Campos menores faltantes' : 'Minor missing fields'} ({minor.length})
            </span>
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {minor.map((f, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] ${dm ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                {f.label || f.field}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Inconsistencies + Clinical Alerts — same style as Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Inconsistencies */}
        <div className={card}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
            <span className="text-sm">⚡</span>
            <div>
              <span className={`text-xs font-bold uppercase ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                {es ? 'Inconsistencias' : 'Inconsistencies'}
              </span>
              <p className={`text-[11px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
                {es ? 'Errores detectados por IA' : 'AI-detected errors'}
              </p>
            </div>
          </div>
          {inconsistencies.length > 0 ? (
            <div>
              {inconsistencies.map((inc, i) => (
                <div key={i} className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    inc.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <span className={`text-[11px] font-bold uppercase mr-1.5 ${
                    inc.severity === 'error' ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-amber-400' : 'text-amber-600')
                  }`}>
                    {inc.severity === 'error' ? 'ERROR' : (es ? 'AVISO' : 'WARNING')}
                  </span>
                  <div className={`mt-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.finding || inc.description || '') }} />
                    {inc.suggestion && (
                      <span className={dm ? 'text-gray-400' : 'text-gray-500'}> → <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.suggestion) }} /></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`px-3 py-4 text-center font-medium ${dm ? 'text-green-400' : 'text-green-600'}`}>
              ✓ {es ? 'Sin inconsistencias detectadas' : 'No inconsistencies detected'}
            </div>
          )}
        </div>

        {/* Clinical Alerts */}
        <div className={card}>
          <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
            <span className="text-sm">🔬</span>
            <div>
              <span className={`text-xs font-bold uppercase ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                {es ? 'Alertas clínicas' : 'Clinical alerts'}
              </span>
              <p className={`text-[11px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
                {es ? 'Observaciones de razonamiento clínico' : 'Clinical reasoning observations'}
              </p>
            </div>
          </div>
          {alerts.length > 0 ? (
            <div>
              {alerts.map((a, i) => (
                <div key={i} className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className="inline-block w-2 h-2 rounded-full mr-2 bg-blue-500" />
                  <span className={`text-[11px] font-bold uppercase mr-1.5 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
                    {es ? 'ALERTA CLÍNICA' : 'CLINICAL ALERT'}
                  </span>
                  <div className={`mt-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}
                    dangerouslySetInnerHTML={{ __html: highlightClinical(a.alert) }} />
                </div>
              ))}
            </div>
          ) : (
            <div className={`px-3 py-4 text-center ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
              {es ? 'Sin alertas clínicas' : 'No clinical alerts'}
            </div>
          )}
        </div>
      </div>

      {/* Perfect report */}
      {isPerfect && (
        <div className={`${card} p-3`}>
          <div className={`flex items-center gap-2 font-medium ${dm ? 'text-green-400' : 'text-green-700'}`}>
            <Check className="w-5 h-5" />
            {es ? 'Informe completo — sin problemas detectados' : 'Complete report — no issues detected'}
          </div>
        </div>
      )}
    </div>
  )
}
