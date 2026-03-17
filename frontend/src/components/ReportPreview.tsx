import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Copy, Check, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
import type { ProtocolDef } from '../data/protocols'
import type { FormValues, SectionStatus } from '../hooks/useFormState'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { generateReport, REPORT_STYLES } from '../data/templates'
import { getFormatRules } from './FormatConfig'
import type { ReportStyle } from '../data/templates'
import type { FieldDef } from '../data/protocols'

import { highlightClinical } from '../data/utils'
import { evaluateRules } from '../data/rules'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface AIReviewResult {
  completeness_score: number
  missing_fields: { field: string; label?: string; severity: string; action?: string; recommendation?: string }[]
  inconsistencies: { finding: string; description?: string; severity: string; suggestion?: string }[]
  clinical_alerts?: { alert: string; type: string }[]
}

interface ReportPreviewProps {
  protocol: ProtocolDef
  values: FormValues
  lang: Lang
  includeMacro: boolean
  completionPercent: number
  pendingFields: FieldDef[]
  sectionStatuses: SectionStatus[]
  accessCode: string
  darkMode?: boolean
  reportStyle: ReportStyle
  onStyleChange: (style: ReportStyle) => void
  onOpenFormatConfig?: () => void
  unitVersion?: number
}

export function ReportPreview({
  protocol, values, lang, includeMacro,
  completionPercent, pendingFields, sectionStatuses, accessCode, darkMode,
  reportStyle, onStyleChange, unitVersion,
}: ReportPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)
  const [formatVersion, setFormatVersion] = useState(0)
  const [editableText, setEditableText] = useState('')
  const [hasBeenGenerated, setHasBeenGenerated] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Listen for format config changes (localStorage)
  useEffect(() => {
    const handler = () => setFormatVersion(v => v + 1)
    window.addEventListener('storage', handler)
    // Also re-check when component gets focus (same-tab localStorage changes)
    const focusHandler = () => setFormatVersion(v => v + 1)
    window.addEventListener('focus', focusHandler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('focus', focusHandler)
    }
  }, [])

  const rawReport = useMemo(
    () => generateReport(protocol, values, lang, includeMacro, reportStyle),
    [protocol, values, lang, includeMacro, reportStyle, unitVersion]
  )

  // Apply format rules from FormatConfig to the report HTML
  const report = useMemo(() => {
    const fmt = getFormatRules()

    const applyStyle = (text: string, style: { bold: boolean; italic: boolean; uppercase: boolean; underline: boolean }) => {
      let t = text
      if (style.uppercase) t = t.toUpperCase()
      else t = t.replace(/^([A-ZÁÉÍÓÚÑ\s]+)$/gm, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
      const parts: string[] = []
      if (style.bold) parts.push('font-weight:bold')
      if (style.italic) parts.push('font-style:italic')
      if (style.underline) parts.push('text-decoration:underline')
      if (parts.length > 0) return `<span style="${parts.join(';')}">${t}</span>`
      return t
    }

    // Known section headers and diagnosis line patterns
    const sectionHeaders = [
      'INFORME DE ANATOMÍA PATOLÓGICA', 'PATHOLOGY REPORT',
      'INFORME SINÓPTICO DE ANATOMÍA PATOLÓGICA', 'SYNOPTIC PATHOLOGY REPORT',
      'DESCRIPCIÓN MICROSCÓPICA', 'MICROSCOPIC DESCRIPTION',
      'DESCRIPCIÓN MACROSCÓPICA', 'MACROSCOPIC DESCRIPTION', 'GROSS DESCRIPTION',
      'CODIFICACIÓN', 'CODING', 'ICD-O CODING',
      'ESTADIFICACIÓN', 'STAGING',
    ]
    const diagHeaders = ['DIAGNÓSTICO', 'DIAGNOSIS']

    let result = rawReport
    // Apply section header formatting
    for (const h of sectionHeaders) {
      const regex = new RegExp(`^(${h}:?)$`, 'gmi')
      result = result.replace(regex, (match) => applyStyle(match, fmt.sectionHeaders))
    }
    // Apply diagnosis formatting
    for (const h of diagHeaders) {
      const regex = new RegExp(`^(${h}:?)$`, 'gmi')
      result = result.replace(regex, (match) => applyStyle(match, fmt.diagnosis))
    }

    return result
  }, [rawReport, formatVersion])

  // Generate text into textarea (only on first render or explicit regenerate)
  const generateIntoTextarea = useCallback(() => {
    // Strip HTML tags for plain text textarea
    const plainText = rawReport.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    setEditableText(plainText)
    setHasBeenGenerated(true)
  }, [rawReport])

  // Auto-generate whenever form fields change
  useEffect(() => {
    if (rawReport) {
      generateIntoTextarea()
    }
  }, [rawReport, hasBeenGenerated, generateIntoTextarea])

  const handleRegenerate = () => {
    const msg = lang === 'es'
      ? '¿Regenerar el informe desde el formulario? Se perderán las ediciones manuales.'
      : 'Regenerate report from form? Manual edits will be lost.'
    if (window.confirm(msg)) {
      generateIntoTextarea()
    }
  }

  const handleCopy = async () => {
    const text = editableText || rawReport
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReview = useCallback(async () => {
    if (!editableText || reviewing) return
    setReviewing(true)
    setReviewResult(null)
    try {
      const reportText = editableText
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auditor',
          report_text: reportText,
          access_code: accessCode,
          lang: lang,
          protocol_id: protocol.id,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.validation) {
        setReviewResult(data.validation)
      }
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setReviewing(false)
    }
  }, [editableText, reviewing, accessCode, lang, protocol.id])

  const criticalPending = pendingFields.filter(f => f.severity === 'critical')
  const majorPending = pendingFields.filter(f => f.severity === 'major')
  const hasAnyData = completionPercent > 0

  // Inline deterministic rules
  const inlineAlerts = useMemo(() => evaluateRules(protocol.id, values), [protocol.id, values])

  const dm = darkMode
  const cardClass = dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-[var(--color-border)]'
  const textSec = dm ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'
  return (
    <div className="space-y-2">
      {/* Row 1: 3 cuadros — Completitud | Crítico | Mayor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[13px]">
        {/* Completitud — anillo + barras */}
        <div className={`rounded-lg border p-3 ${cardClass}`}>
          <div className="flex gap-3">
            {/* Completion Ring SVG */}
            <div className="shrink-0 flex items-center justify-center">
              <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
                <circle cx="36" cy="36" r="29" fill="none" stroke={dm ? '#374151' : '#E2E5EA'} strokeWidth="6" />
                <circle cx="36" cy="36" r="29" fill="none"
                  stroke={completionPercent >= 80 ? 'var(--color-success)' : completionPercent >= 50 ? 'var(--color-warning)' : 'var(--color-critical)'}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 29}`}
                  strokeDashoffset={`${2 * Math.PI * 29 * (1 - completionPercent / 100)}`}
                  className="transition-all duration-700 ease-out"
                />
                <text x="36" y="36" textAnchor="middle" dominantBaseline="central"
                  className="transform rotate-90 origin-center"
                  fill={completionPercent >= 80 ? 'var(--color-success)' : completionPercent >= 50 ? 'var(--color-warning-text)' : 'var(--color-critical)'}
                  fontSize="16" fontWeight="700" fontFamily="var(--font-mono)">
                  {completionPercent}%
                </text>
              </svg>
            </div>
            {/* Section bars */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <span className={`text-[13px] font-semibold uppercase tracking-wider ${textSec}`}>
                {t('completion.title', lang)}
              </span>
              {sectionStatuses.map(s => {
                const pct = s.total > 0 ? (s.filled / s.total) * 100 : 0
                const barColor = s.status === 'complete' ? 'var(--color-success)' : s.status === 'partial' ? 'var(--color-warning)' : (dm ? '#374151' : '#E2E5EA')
                return (
                  <a key={s.id} href={`#section-${s.id}`}
                    className={`flex items-center gap-2 leading-[20px] px-1 rounded group ${dm ? 'hover:bg-gray-800' : 'hover:bg-[var(--color-surface-alt)]'}`}>
                    <span className={`truncate flex-1 min-w-0 ${textSec}`}>{t(`form.section.${s.id}` as any, lang)}</span>
                    <div className={`w-16 h-1.5 rounded-full overflow-hidden shrink-0 ${dm ? 'bg-gray-700' : 'bg-[var(--color-surface-alt)]'}`}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                    <span className={`font-mono w-8 text-right text-xs shrink-0 ${s.status === 'complete' ? 'text-[var(--color-success)]' : s.status === 'partial' ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-na)]'}`}>
                      {s.status === 'complete' ? '✓' : `${s.filled}/${s.total}`}
                    </span>
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Crítico */}
        <div className={`rounded-lg border p-3 ${hasAnyData && criticalPending.length > 0
          ? (dm ? 'bg-red-950/50 border-red-800' : 'bg-[var(--color-critical-bg)] border-red-200')
          : cardClass}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {hasAnyData && criticalPending.length > 0 && <AlertTriangle className={`w-4 h-4 ${dm ? 'text-red-400' : 'text-[var(--color-critical)]'}`} />}
            <span className={`font-bold uppercase ${hasAnyData && criticalPending.length > 0
              ? (dm ? 'text-red-400' : 'text-[var(--color-critical-text)]')
              : textSec}`}>
              {lang === 'es' ? 'Faltantes críticos' : 'Critical missing'} ({criticalPending.length})
            </span>
          </div>
          {criticalPending.length > 0 ? (
            <div className="space-y-0.5">
              {criticalPending.map(f => (
                <div key={f.name} className={`${dm ? 'text-red-300' : 'text-[var(--color-critical-text)]'}`}>
                  • <strong>{lang === 'es' ? f.label_es : f.label_en}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 ${dm ? 'text-green-400' : 'text-[var(--color-success)]'}`}>
              <Check className="w-4 h-4" /> {lang === 'es' ? 'Sin campos críticos' : 'No critical fields'}
            </div>
          )}
        </div>

        {/* Mayor */}
        <div className={`rounded-lg border p-3 ${hasAnyData && majorPending.length > 0
          ? (dm ? 'bg-orange-950/50 border-orange-800' : 'bg-[var(--color-major-bg)] border-orange-200')
          : cardClass}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            {hasAnyData && majorPending.length > 0 && <AlertTriangle className={`w-4 h-4 ${dm ? 'text-orange-400' : 'text-[var(--color-major)]'}`} />}
            <span className={`font-bold uppercase ${hasAnyData && majorPending.length > 0
              ? (dm ? 'text-orange-400' : 'text-[var(--color-major-text)]')
              : textSec}`}>
              {lang === 'es' ? 'Faltantes recomendados' : 'Recommended missing'} ({majorPending.length})
            </span>
          </div>
          {majorPending.length > 0 ? (
            <div className="space-y-0.5">
              {majorPending.map(f => (
                <div key={f.name} className={`${dm ? 'text-orange-300' : 'text-[var(--color-major-text)]'}`}>
                  • {lang === 'es' ? f.label_es : f.label_en}
                </div>
              ))}
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 ${dm ? 'text-green-400' : 'text-[var(--color-success)]'}`}>
              <Check className="w-4 h-4" /> {lang === 'es' ? 'Sin campos mayores' : 'No major fields'}
            </div>
          )}
        </div>
      </div>

      {/* Alerts: side-by-side — Automatic (left) | AI Review (right) */}
      {(inlineAlerts.length > 0 || reviewResult || reviewing) && (
        <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-2 text-[13px]">

          {/* LEFT — Automatic validation */}
          <div className={`rounded-xl border overflow-hidden self-start ${dm ? 'bg-gray-900 border-gray-700' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
              <span className="text-sm">⚡</span>
              <div>
                <span className={`text-xs font-bold uppercase ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                  {lang === 'es' ? 'Validación automática' : 'Automatic validation'}
                </span>
                <p className={`text-[11px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
                  {lang === 'es' ? 'Instantánea, basada en reglas' : 'Instant, rule-based'}
                </p>
              </div>
            </div>
            {inlineAlerts.length > 0 ? (
              <div>
                {inlineAlerts.map(a => (
                  <div key={a.id} className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      a.severity === 'error' ? 'bg-red-500' : a.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <span className={`text-[11px] font-bold uppercase mr-1.5 ${
                      a.severity === 'error' ? (dm ? 'text-red-400' : 'text-red-600') :
                      a.severity === 'warning' ? (dm ? 'text-amber-400' : 'text-amber-600') :
                      (dm ? 'text-blue-400' : 'text-blue-600')
                    }`}>
                      {a.severity === 'error' ? 'ERROR' : a.severity === 'warning' ? (lang === 'es' ? 'AVISO' : 'WARNING') : 'INFO'}
                    </span>
                    <div className={`mt-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}
                      dangerouslySetInnerHTML={{ __html: highlightClinical(lang === 'es' ? a.message_es : a.message_en) }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={`px-3 py-4 text-center ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                {lang === 'es' ? 'Sin alertas automáticas' : 'No automatic alerts'}
              </div>
            )}
          </div>

          {/* RIGHT — AI Review */}
          <div className={`rounded-xl border overflow-hidden self-start ${dm ? 'bg-gray-900 border-gray-700' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`}>
            <div className={`flex items-center gap-2 px-3 py-2 border-b ${dm ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-[var(--color-border)]'}`}>
              <span className="text-sm">🔬</span>
              <div>
                <span className={`text-xs font-bold uppercase ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                  {lang === 'es' ? 'Revisión IA' : 'AI Review'}
                </span>
                <p className={`text-[11px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
                  {lang === 'es' ? 'Análisis profundo del informe' : 'Deep report analysis'}
                </p>
              </div>
            </div>

            {reviewing ? (
              <div className={`px-3 py-4 flex items-center justify-center gap-2 ${dm ? 'text-blue-300' : 'text-[var(--color-info-text)]'}`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                {lang === 'es' ? 'La IA está revisando...' : 'AI is reviewing...'}
              </div>
            ) : reviewResult ? (
              <div>
                {/* No issues */}
                {(reviewResult.inconsistencies?.length === 0 && reviewResult.clinical_alerts?.length === 0 && (!reviewResult.missing_fields || reviewResult.missing_fields.length === 0)) && (
                  <div className={`px-3 py-4 text-center font-medium ${dm ? 'text-green-400' : 'text-green-600'}`}>
                    ✓ {lang === 'es' ? 'Sin inconsistencias detectadas' : 'No inconsistencies detected'}
                  </div>
                )}

                {/* Inconsistencies */}
                {reviewResult.inconsistencies?.map((inc, i) => (
                  <div key={`inc-${i}`} className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      inc.severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-[11px] font-bold uppercase mr-1.5 ${
                      inc.severity === 'error' ? (dm ? 'text-red-400' : 'text-red-600') : (dm ? 'text-amber-400' : 'text-amber-600')
                    }`}>
                      {inc.severity === 'error' ? 'ERROR' : (lang === 'es' ? 'AVISO' : 'WARNING')}
                    </span>
                    <div className={`mt-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.finding || inc.description || '') }} />
                      {inc.suggestion && (
                        <span className={dm ? 'text-gray-400' : 'text-gray-500'}> → <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.suggestion) }} /></span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Clinical Alerts */}
                {reviewResult.clinical_alerts?.map((alert, i) => (
                  <div key={`alert-${i}`} className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-2 bg-blue-500" />
                    <span className={`text-[11px] font-bold uppercase mr-1.5 ${dm ? 'text-blue-400' : 'text-blue-600'}`}>
                      {lang === 'es' ? 'ALERTA CLÍNICA' : 'CLINICAL ALERT'}
                    </span>
                    <div className={`mt-1 ${dm ? 'text-gray-300' : 'text-gray-700'}`}
                      dangerouslySetInnerHTML={{ __html: highlightClinical(alert.alert) }} />
                  </div>
                ))}

                {/* Missing fields from AI */}
                {reviewResult.missing_fields?.length > 0 && (
                  <div className={`px-3 py-2.5 border-b last:border-b-0 ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                    <span className="inline-block w-2 h-2 rounded-full mr-2 bg-orange-500" />
                    <span className={`text-[11px] font-bold uppercase mr-1.5 ${dm ? 'text-orange-400' : 'text-orange-600'}`}>
                      {lang === 'es' ? 'CAMPOS FALTANTES' : 'MISSING FIELDS'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {reviewResult.missing_fields.filter(f => f.severity === 'critical').map((f, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${dm ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}>
                          {f.label || f.field}{f.action ? ` → ${f.action}` : ''}
                        </span>
                      ))}
                      {reviewResult.missing_fields.filter(f => f.severity === 'major').map((f, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${dm ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                          {f.label || f.field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`px-3 py-4 text-center ${dm ? 'text-gray-600' : 'text-gray-400'}`}>
                {lang === 'es' ? 'Pulse "Revisar con IA" para analizar' : 'Click "Review with AI" to analyze'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Banner CAP compliance warning */}
      {hasAnyData && criticalPending.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-[12px] font-medium">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {lang === 'es'
              ? `${criticalPending.length} campo${criticalPending.length > 1 ? 's' : ''} obligatorio${criticalPending.length > 1 ? 's' : ''} CAP pendiente${criticalPending.length > 1 ? 's' : ''} — el informe no cumple protocolo`
              : `${criticalPending.length} required CAP field${criticalPending.length > 1 ? 's' : ''} pending — report does not meet protocol`}
          </span>
        </div>
      )}

      {/* Row 2: Informe editable con toolbar */}
      <div className={`rounded-lg border overflow-hidden flex flex-col flex-1 ${dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-[var(--color-border)]'}`}>
        {/* Toolbar: formato + copiar + IA */}
        <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1 border-b border-[var(--color-surface-alt)]">
          <div className="flex items-center gap-1">
            <span className={`text-[12px] font-semibold uppercase tracking-wider mr-2 ${textSec}`}>
              {t('report.title', lang)}
            </span>
            <select
              value={reportStyle}
              onChange={e => onStyleChange(e.target.value as ReportStyle)}
              className={`text-[11px] px-1.5 py-0.5 rounded border mr-2 ${dm ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-[var(--color-border)] text-[var(--color-text)]'}`}
            >
              {REPORT_STYLES.map(s => (
                <option key={s.value} value={s.value}>{lang === 'es' ? s.label_es : s.label_en}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            {report && (
              <button onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 text-[12px] font-medium rounded border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]">
                {copied ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
                {copied ? t('report.copied', lang) : t('report.copy', lang)}
              </button>
            )}
            {report && (
              <button
                onClick={handleReview}
                disabled={reviewing}
                className={`flex items-center gap-1 px-2 py-0.5 text-[12px] font-medium rounded text-white transition-all ${
                  reviewing ? 'bg-green-600 animate-pulse' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)]'
                } disabled:cursor-wait`}
              >
                {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {reviewing ? (lang === 'es' ? 'Analizando...' : 'Analyzing...') : t('report.review', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Report content — editable */}
        <div className="p-3 flex-1">
          {report ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] inline-block">
                  {t('report.draft', lang)}
                </div>
                <button
                  onClick={handleRegenerate}
                  className="text-[10px] text-[var(--color-primary)] hover:underline"
                >
                  {lang === 'es' ? '↺ Regenerar desde formulario' : '↺ Regenerate from form'}
                </button>
              </div>
              <textarea
                ref={textareaRef}
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className={`w-full min-h-[300px] p-3 rounded-lg border text-sm resize-y ${
                  dm ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-[var(--color-border-input)] text-[var(--color-text)]'
                } focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent`}
                style={{ fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}
              />
              <div className="text-[10px] text-[var(--color-text-tertiary)] mt-1 italic">
                {lang === 'es' ? 'Edite libremente. "Revisar con IA" leerá este texto. Los cambios del formulario no sobreescriben.' : 'Edit freely. "Review with AI" reads this text. Form changes don\'t overwrite.'}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-[var(--color-text-tertiary)]">
              {t('report.empty', lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
