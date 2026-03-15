import { useState, useMemo, useRef, useCallback } from 'react'
import { Copy, Check, AlertTriangle, Sparkles, Bold, Italic, Underline, CaseSensitive, Loader2 } from 'lucide-react'
import type { ProtocolDef } from '../data/protocols'
import type { FormValues, SectionStatus } from '../hooks/useFormState'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { generateReport } from '../data/templates'
import type { FieldDef } from '../data/protocols'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

interface AIReviewResult {
  completeness_score: number
  missing_fields: { field: string; severity: string; recommendation: string }[]
  inconsistencies: { description: string; severity: string }[]
  quality_notes: string
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
}

export function ReportPreview({
  protocol, values, lang, includeMacro,
  completionPercent, pendingFields, sectionStatuses, accessCode, darkMode,
}: ReportPreviewProps) {
  const [copied, setCopied] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const report = useMemo(
    () => generateReport(protocol, values, lang, includeMacro),
    [protocol, values, lang, includeMacro]
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
      {/* Row 1: Completitud + Alertas */}
      <div className="flex gap-2">
        <div className={`rounded-lg border p-2.5 min-w-[180px] ${cardClass}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[13px] font-semibold uppercase ${textSec}`}>
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
                className="flex items-center justify-between text-[13px] leading-[20px] px-1 rounded hover:bg-[var(--color-surface-alt)]">
                <span className="text-[var(--color-text-secondary)] truncate">{t(`form.section.${s.id}` as any, lang)}</span>
                <span className={`font-mono ${s.status === 'complete' ? 'text-[var(--color-success)]' : s.status === 'partial' ? 'text-[var(--color-warning-text)]' : 'text-[var(--color-na)]'}`}>
                  {s.status === 'complete' ? '✓' : `${s.filled}/${s.total}`}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          {criticalPending.length > 0 && (
            <div className="p-2 rounded-lg bg-[var(--color-critical-bg)]">
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-critical)]" />
                <span className="text-[13px] font-bold text-[var(--color-critical-text)] uppercase">
                  {t('severity.critical', lang)} ({criticalPending.length})
                </span>
              </div>
              <p className="text-[13px] leading-snug text-[var(--color-critical-text)]">
                {criticalPending.map(f => lang === 'es' ? f.label_es : f.label_en).join(', ')}
              </p>
            </div>
          )}
          {majorPending.length > 0 && (
            <div className="p-2 rounded-lg bg-[var(--color-major-bg)]">
              <div className="flex items-center gap-1 mb-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-major)]" />
                <span className="text-[13px] font-bold text-[var(--color-major-text)] uppercase">
                  {t('severity.major', lang)} ({majorPending.length})
                </span>
              </div>
              <p className="text-[13px] leading-snug text-[var(--color-major-text)]">
                {majorPending.map(f => lang === 'es' ? f.label_es : f.label_en).join(', ')}
              </p>
            </div>
          )}
          {criticalPending.length === 0 && majorPending.length === 0 && !reviewResult && (
            <div className="p-3 rounded-lg bg-[var(--color-success-bg)] flex items-center gap-2">
              <Check className="w-5 h-5 text-[var(--color-success)]" />
              <span className="text-sm font-semibold text-[var(--color-success-text)]">
                {lang === 'es' ? 'Informe completo' : 'Report complete'}
              </span>
            </div>
          )}

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
              {reviewResult.inconsistencies?.map((inc, i) => (
                <div key={i} className={`p-2 rounded-lg text-[13px] flex items-start gap-2 ${
                  inc.severity === 'error'
                    ? 'bg-[var(--color-critical-bg)] text-[var(--color-critical-text)]'
                    : 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[10px] uppercase mr-1">
                      {inc.severity === 'error'
                        ? (lang === 'es' ? 'ERROR' : 'ERROR')
                        : (lang === 'es' ? 'AVISO' : 'WARNING')}
                    </span>
                    {inc.description || inc.finding}
                  </div>
                </div>
              ))}
              {reviewResult.quality_notes && (
                <div className={`p-2 rounded-lg text-[13px] ${dm ? 'bg-blue-900/20 text-blue-300' : 'bg-[var(--color-info-bg)] text-[var(--color-info-text)]'}`}>
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  {reviewResult.quality_notes}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Informe editable con toolbar */}
      <div className="rounded-lg border border-[var(--color-border)] overflow-hidden bg-white flex flex-col min-h-[400px]">
        {/* Toolbar: formato + copiar + IA */}
        <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--color-surface-alt)]">
          <div className="flex items-center gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-wider mr-2 text-[var(--color-text-secondary)]">
              {t('report.title', lang)}
            </span>
            <div className="flex items-center border rounded border-[var(--color-border)]">
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
                className="outline-none leading-relaxed whitespace-pre-wrap break-words text-[var(--color-text)]"
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
