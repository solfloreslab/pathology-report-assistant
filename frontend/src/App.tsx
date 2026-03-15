import { useState, useCallback } from 'react'
import { Header } from './components/Header'
import { AccessScreen } from './components/AccessScreen'
import { ProtocolSearch } from './components/ProtocolSearch'
import { ProtocolForm } from './components/ProtocolForm'
import { QuickNotes } from './components/QuickNotes'
import { ReportPreview } from './components/ReportPreview'
import { useLang } from './hooks/useLang'
import { useAccessCode } from './hooks/useAccessCode'
import { useFormState } from './hooks/useFormState'
import type { ProtocolDef } from './data/protocols'
import { t } from './data/i18n'
import type { ReportStyle } from './data/templates'
import { FloatingMicroscope } from './components/FloatingMicroscope'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export default function App() {
  const { lang, toggleLang } = useLang()
  const { authenticated, login, getCode } = useAccessCode()
  const [protocol, setProtocol] = useState<ProtocolDef | null>(null)
  const [includeMacro, setIncludeMacro] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [darkMode, setDarkMode] = useState(false)
  const [reportStyle, setReportStyle] = useState<ReportStyle>('prose')
  const [mode, setMode] = useState<'copilot' | 'auditor'>('copilot')
  const [auditorText, setAuditorText] = useState('')
  const [auditorResult, setAuditorResult] = useState<any>(null)
  const [auditorReviewing, setAuditorReviewing] = useState(false)

  const {
    values, setValue, bulkSetValues, resetValues,
    filledFields, pendingFields, completionPercent, sectionStatuses,
  } = useFormState(protocol)

  const handleSelectProtocol = useCallback((p: ProtocolDef) => {
    setProtocol(p)
    resetValues()
  }, [resetValues])

  const handlePrefill = useCallback(async (notes: string) => {
    if (!protocol) return
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'copilot',
          report_text: notes,
          access_code: getCode(),
          protocol_id: protocol.id,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      if (data.extracted_fields) {
        const newValues: Record<string, string> = {}
        for (const [key, val] of Object.entries(data.extracted_fields)) {
          if (val && val !== 'not_reported' && val !== 'N/A') {
            newValues[key] = String(val)
          }
        }
        bulkSetValues(newValues)
      }
    } catch (err) {
      console.error('Pre-fill failed:', err)
    }
  }, [protocol, getCode, bulkSetValues])

  const handleAudit = useCallback(async () => {
    if (!auditorText.trim() || auditorReviewing) return
    setAuditorReviewing(true)
    setAuditorResult(null)
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auditor',
          report_text: auditorText,
          access_code: getCode(),
          lang,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setAuditorResult(data)
    } catch (err) {
      console.error('Audit failed:', err)
    } finally {
      setAuditorReviewing(false)
    }
  }, [auditorText, auditorReviewing, getCode, lang])

  if (!authenticated) {
    return <AccessScreen lang={lang} toggleLang={toggleLang} onLogin={login} />
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-gray-200' : 'bg-[var(--color-page)] text-[var(--color-text)]'}`} style={{ fontSize: `${fontSize}px` }}>
      <Header
        lang={lang}
        toggleLang={toggleLang}
        completionPercent={protocol ? completionPercent : undefined}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode(d => !d)}
        onHome={protocol ? () => { setProtocol(null); resetValues() } : undefined}
        onLogout={() => { localStorage.removeItem('access_code'); window.location.reload() }}
      />

      <main className="mx-auto px-[10px] py-3 pb-16" style={{ maxWidth: 'calc(100vw - 20px)' }}>
        {/* Mode tabs — only on home screen */}
        {!protocol && (
          <div className="max-w-2xl mx-auto mt-4 mb-2 flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 w-fit">
            <button
              onClick={() => setMode('copilot')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'copilot'
                  ? 'bg-white shadow text-[var(--color-primary)] dark:bg-gray-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {lang === 'es' ? 'Copiloto' : 'Copilot'}
            </button>
            <button
              onClick={() => setMode('auditor')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'auditor'
                  ? 'bg-white shadow text-[var(--color-primary)] dark:bg-gray-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {lang === 'es' ? 'Auditor' : 'Auditor'}
            </button>
          </div>
        )}

        {/* AUDITOR MODE */}
        {!protocol && mode === 'auditor' ? (
          <div className="max-w-4xl mx-auto mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="text-lg font-bold">{lang === 'es' ? 'Pegar informe para auditar' : 'Paste report to audit'}</h3>
                <p className="text-sm text-gray-500">{lang === 'es' ? 'Pegue un informe de anatomía patológica ya firmado. La IA detectará inconsistencias y campos faltantes.' : 'Paste a signed pathology report. AI will detect inconsistencies and missing fields.'}</p>
                <textarea
                  value={auditorText}
                  onChange={(e) => setAuditorText(e.target.value)}
                  placeholder={lang === 'es' ? 'Pegue aquí el informe completo...' : 'Paste the full report here...'}
                  className={`w-full h-64 p-3 rounded-lg border text-sm resize-y ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-300'}`}
                />
                <button
                  onClick={handleAudit}
                  disabled={auditorReviewing || !auditorText.trim()}
                  className="w-full py-3 rounded-lg bg-[var(--color-primary)] text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {auditorReviewing ? (
                    <><span className="animate-spin">⏳</span> {lang === 'es' ? 'Analizando...' : 'Analyzing...'}</>
                  ) : (
                    <>{lang === 'es' ? '🔍 Auditar informe' : '🔍 Audit report'}</>
                  )}
                </button>
              </div>
              <div>
                {auditorResult ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold">{lang === 'es' ? 'Resultado de la auditoría' : 'Audit result'}</h3>
                    {auditorResult.validation?.completeness_score !== undefined && (
                      <div className={`p-3 rounded-lg ${auditorResult.validation.completeness_score >= 90 ? 'bg-green-50' : auditorResult.validation.completeness_score >= 70 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                        <span className="text-2xl font-bold">{auditorResult.validation.completeness_score}%</span>
                        <span className="text-sm ml-2">{lang === 'es' ? 'completitud' : 'completeness'}</span>
                      </div>
                    )}
                    {auditorResult.validation?.inconsistencies?.map((inc: any, i: number) => (
                      <div key={i} className={`p-2.5 rounded-lg border-l-3 text-[13px] ${inc.severity === 'error' ? 'bg-red-50 border-l-red-500' : 'bg-amber-50 border-l-amber-500'}`}>
                        <span className={`text-[10px] font-bold uppercase ${inc.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                          {inc.severity === 'error' ? 'ERROR' : (lang === 'es' ? 'AVISO' : 'WARNING')}
                        </span>
                        <div className="mt-0.5" dangerouslySetInnerHTML={{ __html: highlightClinical(inc.finding || inc.description || '') }} />
                        {inc.suggestion && <div className="text-gray-500 text-[12px] mt-0.5">→ {inc.suggestion}</div>}
                      </div>
                    ))}
                    {auditorResult.validation?.clinical_alerts?.map((alert: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg border-l-3 border-l-blue-400 bg-blue-50 text-[13px]">
                        <span className="text-[10px] font-bold uppercase text-blue-600">{lang === 'es' ? 'ALERTA CLÍNICA' : 'CLINICAL ALERT'}</span>
                        <div className="mt-0.5" dangerouslySetInnerHTML={{ __html: highlightClinical(alert.alert || '') }} />
                      </div>
                    ))}
                    {auditorResult.validation?.missing_required?.map((f: any, i: number) => (
                      <div key={i} className={`p-2 rounded-lg text-[12px] border-l-3 ${f.severity === 'critical' ? 'bg-red-50 border-l-red-400' : 'bg-amber-50 border-l-amber-400'}`}>
                        <span className="font-bold">{f.label || f.field}</span>
                        {f.action && <span className="text-gray-500"> — {f.action}</span>}
                      </div>
                    ))}
                  </div>
                ) : !auditorReviewing && (
                  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                    {lang === 'es' ? 'Pegue un informe y pulse Auditar' : 'Paste a report and click Audit'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !protocol ? (
          <div className="max-w-2xl mx-auto mt-4 relative">
            <FloatingMicroscope />
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[var(--color-primary)] text-xs font-medium mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                {lang === 'es' ? 'Structured Reporting · Open Source' : 'Structured Reporting · Open Source'}
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-[#0a1628] via-[#0F62FE] to-[#6929C4] bg-clip-text text-transparent">
                {t('protocol.select', lang)}
              </h2>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-2 max-w-md mx-auto">
                {t('app.subtitle', lang)}
              </p>
            </div>
            <ProtocolSearch lang={lang} onSelect={handleSelectProtocol} selected={null} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-3">
            <div className="space-y-3">
              <ProtocolSearch lang={lang} onSelect={handleSelectProtocol} selected={protocol} />

<QuickNotes
                lang={lang}
                onPrefill={handlePrefill}
                protocolId={protocol.id}
                onRealtimeParse={(matches) => {
                  const newValues: Record<string, string> = {}
                  for (const m of matches) {
                    newValues[m.field] = m.value
                  }
                  bulkSetValues(newValues)
                }}
              />

              <ProtocolForm
                protocol={protocol}
                values={values}
                onChange={setValue}
                sectionStatuses={sectionStatuses}
                lang={lang}
                darkMode={darkMode}
              />
            </div>

            <div>
              <div className="lg:sticky lg:top-[60px] lg:max-h-[calc(100vh-70px)] lg:overflow-y-auto">
                <ReportPreview
                  protocol={protocol}
                  values={values}
                  lang={lang}
                  includeMacro={false}
                  completionPercent={completionPercent}
                  pendingFields={pendingFields}
                  sectionStatuses={sectionStatuses}
                  accessCode={getCode()}
                  darkMode={darkMode}
                  reportStyle={reportStyle}
                  onStyleChange={setReportStyle}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`fixed bottom-0 left-0 right-0 py-2 text-center border-t z-10 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-[var(--color-border)] bg-[var(--color-page)]'}`}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] opacity-50">
          <span>{t('footer.disclaimer', lang)}</span>
          <span>·</span>
          <span>{t('footer.synthetic', lang)}</span>
          <span>·</span>
          <a href="https://github.com/solfloreslab/pathology-report-agent" target="_blank" rel="noopener" className="text-[var(--color-primary)] hover:underline">GitHub</a>
          <span>·</span>
          <span>{t('footer.built', lang)}</span>
          <span>·</span>
          <span>© 2026 solfloreslab</span>
        </div>
      </footer>
    </div>
  )
}
