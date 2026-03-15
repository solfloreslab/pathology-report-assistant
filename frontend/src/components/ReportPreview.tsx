import { useState, useMemo, useRef, useCallback } from 'react'
import { Copy, Check, AlertTriangle, Sparkles, Bold, Italic, Underline, CaseSensitive, Loader2 } from 'lucide-react'
import type { ProtocolDef } from '../data/protocols'
import type { FormValues, SectionStatus } from '../hooks/useFormState'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { generateReport, REPORT_STYLES } from '../data/templates'
import type { ReportStyle } from '../data/templates'
import type { FieldDef } from '../data/protocols'

import { highlightClinical } from '../data/utils'

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
}

export function ReportPreview({
  protocol, values, lang, includeMacro,
  completionPercent, pendingFields, sectionStatuses, accessCode, darkMode,
  reportStyle, onStyleChange,
}: ReportPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const report = useMemo(
    () => generateReport(protocol, values, lang, includeMacro, reportStyle),
    [protocol, values, lang, includeMacro, reportStyle]
  )

  const handleCopy = async () => {
    const text = reportRef.current?.innerText || report
    if (text) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    reportRef.current?.focus()
  }, [])

  const handleReview = useCallback(async () => {
    if (!report || reviewing) return
    setReviewing(true)
    setReviewResult(null)
    try {
      const reportText = reportRef.current?.innerText || report
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
  }, [report, reviewing, accessCode])

  const criticalPending = pendingFields.filter(f => f.severity === 'critical')
  const majorPending = pendingFields.filter(f => f.severity === 'major')

  const dm = darkMode
  const cardClass = dm ? 'bg-gray-900 border-gray-700' : 'bg-white border-[var(--color-border)]'
  const textMain = dm ? 'text-gray-200' : 'text-[var(--color-text)]'
  const textSec = dm ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'
  const toolbarBtn = `p-1.5 rounded transition-colors ${dm ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/10'}`

  return (
    <div className="space-y-2">
      {/* Row 1: 3 cuadros — Completitud | Crítico | Mayor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Completitud */}
        <div className={`rounded-lg border p-2.5 ${cardClass}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold uppercase ${textSec}`}>
              {t('completion.title', lang)}
            </span>
            <span className="text-sm font-bold font-mono" style={{
              color: completionPercent >= 80 ? 'var(--color-success)' :
                completionPercent >= 50 ? 'var(--color-warning-text)' : 'var(--color-critical)',
            }}>{completionPercent}%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mb-1.5 ${dm ? 'bg-gray-700' : 'bg-[var(--color-surface-alt)]'}`}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionPercent}%`,
                backgroundColor: completionPercent >= 80 ? 'var(--color-success)' :
                  completionPercent >= 50 ? 'var(--color-warning)' : 'var(--color-critical)',
              }} />
          </div>
          <div className="space-y-0">
            {sectionStatuses.map(s => (
              <a key={s.id} href={`#section-${s.id}`}
                className="flex items-center justify-between text-[11px] leading-[18px] px-1 rounded hover:bg-[var(--color-surface-alt)]">
                <span className="text-[var(--color-text-secondary)] truncate">{t(`form.section.${s.id}` as any, lang)}</span>
                <span className={`font-mono ${s.status === 'complete' ? 'text-[var(--color-success)]' : s.status === 'partial' ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-na)]'}`}>
                  {s.status === 'complete' ? '✓' : `${s.filled}/${s.total}`}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Crítico */}
        <div className={`rounded-lg border p-2.5 ${criticalPending.length > 0 ? 'bg-[var(--color-critical-bg)] border-red-200' : cardClass}`}>
          <div className="flex items-center gap-1 mb-1">
            {criticalPending.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-critical)]" />}
            <span className={`text-[11px] font-bold uppercase ${criticalPending.length > 0 ? 'text-[var(--color-critical-text)]' : textSec}`}>
              {t('severity.critical', lang)} ({criticalPending.length})
            </span>
          </div>
          {criticalPending.length > 0 ? (
            <div className="space-y-0.5">
              {criticalPending.map(f => (
                <div key={f.name} className="text-[11px] text-[var(--color-critical-text)]">
                  • <strong>{lang === 'es' ? f.label_es : f.label_en}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-success)]">
              <Check className="w-3 h-3" /> {lang === 'es' ? 'Sin campos críticos' : 'No critical fields'}
            </div>
          )}
        </div>

        {/* Mayor */}
        <div className={`rounded-lg border p-2.5 ${majorPending.length > 0 ? 'bg-[var(--color-major-bg)] border-orange-200' : cardClass}`}>
          <div className="flex items-center gap-1 mb-1">
            {majorPending.length > 0 && <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-major)]" />}
            <span className={`text-[11px] font-bold uppercase ${majorPending.length > 0 ? 'text-[var(--color-major-text)]' : textSec}`}>
              {t('severity.major', lang)} ({majorPending.length})
            </span>
          </div>
          {majorPending.length > 0 ? (
            <div className="space-y-0.5">
              {majorPending.map(f => (
                <div key={f.name} className="text-[11px] text-[var(--color-major-text)]">
                  • {lang === 'es' ? f.label_es : f.label_en}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-[var(--color-success)]">
              <Check className="w-3 h-3" /> {lang === 'es' ? 'Sin campos mayores' : 'No major fields'}
            </div>
          )}
        </div>
      </div>

      {/* AI Review alerts — below the 3 boxes */}
      <div className="space-y-1.5">

          {/* AI Review results — shown in alert panel */}
          {reviewing && (
            <div className={`p-2.5 rounded-lg flex items-center gap-2 ${dm ? 'bg-blue-900/30' : 'bg-[var(--color-info-bg)]'}`}>
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primary)]" />
              <span className={`text-[13px] ${dm ? 'text-blue-300' : 'text-[var(--color-info-text)]'}`}>
                {lang === 'es' ? 'La IA está revisando...' : 'AI is reviewing...'}
              </span>
            </div>
          )}

          {reviewResult && !reviewing && (
            <div className="space-y-1.5">
              {/* AI Review header */}
              {(reviewResult.inconsistencies?.length === 0 && reviewResult.clinical_alerts?.length === 0) && (
                <div className="p-2.5 rounded-lg text-[13px] border-l-3 bg-green-50 border-l-green-500 dark:bg-green-900/20">
                  <span className="font-bold text-green-700 dark:text-green-300">
                    ✓ {lang === 'es' ? 'Sin inconsistencias detectadas' : 'No inconsistencies detected'}
                  </span>
                </div>
              )}
              {/* Inconsistencies */}
              {reviewResult.inconsistencies?.map((inc, i) => (
                <div key={`inc-${i}`} className={`p-2.5 rounded-lg text-[13px] border-l-3 ${
                  inc.severity === 'error'
                    ? 'bg-[var(--color-critical-bg)] border-l-red-500'
                    : 'bg-[var(--color-warning-bg)] border-l-amber-500'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className={`font-bold text-[10px] uppercase ${
                      inc.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {inc.severity === 'error' ? 'ERROR' : (lang === 'es' ? 'AVISO' : 'WARNING')}
                    </span>
                  </div>
                  <div className={dm ? 'text-gray-200' : 'text-gray-800'}>
                    <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.finding || inc.description || '') }} />
                    {inc.suggestion && (
                      <span className={dm ? 'text-gray-400' : 'text-gray-500'}> → <span dangerouslySetInnerHTML={{ __html: highlightClinical(inc.suggestion) }} /></span>
                    )}
                  </div>
                </div>
              ))}
              {/* Clinical Alerts */}
              {reviewResult.clinical_alerts?.map((alert, i) => (
                <div key={`alert-${i}`} className={`p-2.5 rounded-lg text-[13px] border-l-3 ${
                  alert.type === 'warning'
                    ? 'bg-amber-50 border-l-amber-400 dark:bg-amber-900/20'
                    : 'bg-blue-50 border-l-blue-400 dark:bg-blue-900/20'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold uppercase text-blue-600">
                      {lang === 'es' ? 'ALERTA CLÍNICA' : 'CLINICAL ALERT'}
                    </span>
                  </div>
                  <div className={dm ? 'text-gray-200' : 'text-gray-800'}
                    dangerouslySetInnerHTML={{ __html: highlightClinical(alert.alert) }}
                  />
                </div>
              ))}
              {/* Missing fields from AI (puntual) */}
              {reviewResult.missing_fields?.length > 0 && (
                <div className={`p-2.5 rounded-lg text-[13px] border-l-3 border-l-orange-400 ${dm ? 'bg-orange-900/20' : 'bg-orange-50'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-bold uppercase text-orange-600">
                      {lang === 'es' ? 'CAMPOS FALTANTES (IA)' : 'MISSING FIELDS (AI)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewResult.missing_fields.filter(f => f.severity === 'critical').map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {f.label || f.field}{f.action ? ` → ${f.action}` : ''}
                      </span>
                    ))}
                    {reviewResult.missing_fields.filter(f => f.severity === 'major').map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {f.label || f.field}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Row 2: Informe editable con toolbar */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden bg-white flex flex-col min-h-[400px]">
        {/* Toolbar: formato + copiar + IA */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-surface-alt)]">
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
            <div className={`flex items-center border rounded ${dm ? 'border-gray-600' : 'border-[var(--color-border)]'}`}>
              <button onClick={() => applyFormat('bold')} className={toolbarBtn} title="Bold">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => applyFormat('italic')} className={toolbarBtn} title="Italic">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => applyFormat('underline')} className={toolbarBtn} title="Underline">
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => {
                const sel = window.getSelection()
                if (sel && sel.toString()) {
                  const text = sel.toString()
                  document.execCommand('insertText', false, text === text.toUpperCase() ? text.toLowerCase() : text.toUpperCase())
                }
              }} className={toolbarBtn} title="UPPERCASE / lowercase">
                <CaseSensitive className="w-3.5 h-3.5" />
              </button>
            </div>
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
                className="flex items-center gap-1 px-2 py-0.5 text-[12px] font-medium rounded bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
              >
                {reviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {reviewing ? (lang === 'es' ? 'Revisando...' : 'Reviewing...') : t('report.review', lang)}
              </button>
            )}
          </div>
        </div>

        {/* Report content — editable */}
        <div className="p-3 flex-1">
          {report ? (
            <>
              <div className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] mb-2 inline-block">
                {t('report.draft', lang)}
              </div>
              <div
                ref={reportRef}
                contentEditable
                suppressContentEditableWarning
                className="outline-none whitespace-pre-wrap break-words text-[var(--color-text)] report-text"
                style={{ fontFamily: 'var(--font-sans)' }}
                dangerouslySetInnerHTML={{ __html: report.replace(/\n/g, '<br>') }}
              />

              {/* AI Review results are shown in the alert panel above */}
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
