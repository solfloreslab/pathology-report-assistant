import { AlertTriangle, Check, FileCode, ShieldAlert, Info } from 'lucide-react'
import type { Lang } from '../data/i18n'

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

  // Group missing fields by severity
  const critical = validation.missing_required?.filter(f => f.severity === 'critical') || []
  const major = validation.missing_required?.filter(f => f.severity === 'major') || []
  const minor = validation.missing_required?.filter(f => f.severity === 'minor') || []
  const inconsistencies = validation.inconsistencies || []
  const alerts = validation.clinical_alerts || []
  const coding = validation.suggested_coding

  // Not a valid pathology report
  if (total === 0) {
    return (
      <div className={`p-4 rounded-xl border text-sm ${dm ? 'bg-amber-900/30 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
        ⚠ {es
          ? 'No se reconoce como informe de anatomía patológica. Pegue un informe con diagnóstico histológico, tipo tumoral, estadificación, etc.'
          : 'Not recognized as a pathology report. Paste a report with histologic diagnosis, tumor type, staging, etc.'}
      </div>
    )
  }

  // Perfect report
  const isPerfect = !critical.length && !major.length && !minor.length && !inconsistencies.length && !alerts.length

  // Ring color
  const ringColor = score >= 90 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)'
  const ringTextColor = score >= 90 ? 'var(--color-success)' : score >= 70 ? 'var(--color-warning-text)' : 'var(--color-critical)'

  // Card base
  const card = (color: string) => {
    const map: Record<string, string> = {
      neutral: dm ? 'bg-gray-800/50 border-gray-700' : 'bg-[var(--color-surface)] border-[var(--color-border)]',
      red: dm ? 'bg-red-950/40 border-red-800' : 'bg-red-50 border-red-200',
      orange: dm ? 'bg-orange-950/40 border-orange-800' : 'bg-orange-50 border-orange-200',
      gray: dm ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200',
      blue: dm ? 'bg-blue-950/40 border-blue-800' : 'bg-blue-50 border-blue-200',
      teal: dm ? 'bg-emerald-950/40 border-emerald-800' : 'bg-[var(--color-primary-light)] border-[var(--color-primary)]/20',
      green: dm ? 'bg-green-950/40 border-green-800' : 'bg-green-50 border-green-200',
    }
    return `rounded-xl border p-3 ${map[color] || map.neutral}`
  }

  return (
    <div className="space-y-2 text-[13px]">
      {/* Row 1: Ring | Critical | CIE-O */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {/* Completion ring */}
        <div className={card('neutral')}>
          <div className="flex items-center gap-4">
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

        {/* Critical missing */}
        <div className={card(critical.length > 0 ? 'red' : 'green')}>
          <div className="flex items-center gap-1.5 mb-2">
            {critical.length > 0
              ? <AlertTriangle className={`w-4 h-4 ${dm ? 'text-red-400' : 'text-red-600'}`} />
              : <Check className={`w-4 h-4 ${dm ? 'text-green-400' : 'text-green-600'}`} />}
            <span className={`font-bold uppercase ${dm ? (critical.length > 0 ? 'text-red-400' : 'text-green-400') : (critical.length > 0 ? 'text-red-700' : 'text-green-700')}`}>
              {es ? 'Críticos' : 'Critical'} ({critical.length})
            </span>
          </div>
          {critical.length > 0 ? (
            <div className="space-y-1">
              {critical.map((f, i) => (
                <div key={i} className={`${dm ? 'text-red-300' : 'text-red-700'}`}>
                  • {f.label || f.field}
                </div>
              ))}
            </div>
          ) : (
            <div className={`${dm ? 'text-green-400' : 'text-green-600'}`}>
              {es ? 'Sin campos críticos faltantes' : 'No critical fields missing'}
            </div>
          )}
        </div>

        {/* CIE-O Coding */}
        <div className={card(coding?.topography || coding?.morphology ? 'teal' : 'neutral')}>
          <div className="flex items-center gap-1.5 mb-2">
            <FileCode className={`w-4 h-4 ${dm ? 'text-emerald-400' : 'text-[var(--color-primary)]'}`} />
            <span className={`font-bold uppercase ${dm ? 'text-emerald-400' : 'text-[var(--color-primary)]'}`}>
              CIE-O
            </span>
          </div>
          {coding?.topography || coding?.morphology ? (
            <div className="space-y-1.5">
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
            <div className={dm ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}>
              {es ? 'Sin codificación disponible' : 'No coding available'}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Major | Minor */}
      {(major.length > 0 || minor.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Major */}
          {major.length > 0 && (
            <div className={card('orange')}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className={`w-4 h-4 ${dm ? 'text-orange-400' : 'text-orange-600'}`} />
                <span className={`font-bold uppercase ${dm ? 'text-orange-400' : 'text-orange-700'}`}>
                  {es ? 'Mayores' : 'Major'} ({major.length})
                </span>
              </div>
              <div className="space-y-1">
                {major.map((f, i) => (
                  <div key={i} className={dm ? 'text-orange-300' : 'text-orange-700'}>
                    • {f.label || f.field}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Minor */}
          {minor.length > 0 && (
            <div className={card('gray')}>
              <div className="flex items-center gap-1.5 mb-2">
                <Info className={`w-4 h-4 ${dm ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`font-bold uppercase ${dm ? 'text-gray-400' : 'text-gray-600'}`}>
                  {es ? 'Menores' : 'Minor'} ({minor.length})
                </span>
              </div>
              <div className="space-y-1">
                {minor.map((f, i) => (
                  <div key={i} className={dm ? 'text-gray-400' : 'text-gray-600'}>
                    • {f.label || f.field}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Row 3: Inconsistencies + Clinical Alerts */}
      {(inconsistencies.length > 0 || alerts.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inconsistencies.length > 0 && (
            <div className={card('orange')}>
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert className={`w-4 h-4 ${dm ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`font-bold uppercase ${dm ? 'text-amber-400' : 'text-amber-700'}`}>
                  {es ? 'Inconsistencias' : 'Inconsistencies'} ({inconsistencies.length})
                </span>
              </div>
              <div className="space-y-2">
                {inconsistencies.map((inc, i) => (
                  <div key={i}>
                    <div className={dm ? 'text-amber-300' : 'text-amber-800'}>
                      {inc.finding || inc.description}
                    </div>
                    {inc.suggestion && (
                      <div className={`text-xs mt-0.5 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>→ {inc.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className={card('blue')}>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-bold uppercase ${dm ? 'text-blue-400' : 'text-blue-700'}`}>
                  {es ? 'Alertas clínicas' : 'Clinical alerts'} ({alerts.length})
                </span>
              </div>
              <div className="space-y-1.5">
                {alerts.map((a, i) => (
                  <div key={i} className={dm ? 'text-blue-300' : 'text-blue-800'}>
                    {a.alert}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Perfect report */}
      {isPerfect && (
        <div className={card('green')}>
          <div className={`flex items-center gap-2 font-medium ${dm ? 'text-green-400' : 'text-green-700'}`}>
            <Check className="w-5 h-5" />
            {es ? 'Informe completo — sin problemas detectados' : 'Complete report — no issues detected'}
          </div>
        </div>
      )}
    </div>
  )
}
