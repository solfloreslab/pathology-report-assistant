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
import { MicroscopeMascot } from './components/MicroscopeMascot'
import { BodySelector } from './components/BodySelector'
import { highlightClinical } from './data/utils'
import { DictionaryEditor } from './components/DictionaryEditor'
import { FormatConfig } from './components/FormatConfig'

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
  const [dictOpen, setDictOpen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)

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
        onLogout={() => { localStorage.removeItem('patho-access'); localStorage.removeItem('patho-code'); window.location.reload() }}
        mode={mode}
        onModeChange={(m) => { setMode(m); if (m === 'auditor') { setProtocol(null); resetValues() } }}
      />

      <main className="mx-auto px-[10px] py-3 pb-16" style={{ maxWidth: 'calc(100vw - 20px)' }}>
        {/* AUDITOR MODE */}
        {mode === 'auditor' ? (
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
                    {/* Completeness score */}
                    {auditorResult.validation?.completeness_score !== undefined && (
                      <div className={`p-4 rounded-xl border ${
                        auditorResult.validation.completeness_score >= 90 ? 'bg-green-50 border-green-200' :
                        auditorResult.validation.completeness_score >= 70 ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-3xl font-bold">{auditorResult.validation.completeness_score}%</span>
                            <span className="text-sm ml-2 text-gray-600">{lang === 'es' ? 'completitud' : 'completeness'}</span>
                          </div>
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                            auditorResult.validation.completeness_score >= 90 ? 'bg-green-100 text-green-700' :
                            auditorResult.validation.completeness_score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {auditorResult.validation.reported_fields}/{auditorResult.validation.total_required_fields} {lang === 'es' ? 'campos' : 'fields'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{
                            width: `${auditorResult.validation.completeness_score}%`,
                            backgroundColor: auditorResult.validation.completeness_score >= 90 ? '#22c55e' :
                              auditorResult.validation.completeness_score >= 70 ? '#eab308' : '#ef4444'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Missing fields */}
                    {auditorResult.validation?.missing_required?.length > 0 && (
                      <div className="rounded-xl border border-red-200 overflow-hidden">
                        <div className="px-3 py-2 bg-red-50 border-b border-red-200">
                          <span className="text-[11px] font-bold uppercase text-red-700">
                            {lang === 'es' ? `Campos faltantes (${auditorResult.validation.missing_required.length})` : `Missing fields (${auditorResult.validation.missing_required.length})`}
                          </span>
                        </div>
                        <div className="divide-y divide-red-100">
                          {auditorResult.validation.missing_required.map((f: any, i: number) => (
                            <div key={i} className="px-3 py-2 flex items-center gap-2 text-[13px]">
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                f.severity === 'critical' ? 'bg-red-100 text-red-600' : f.severity === 'major' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                              }`}>{f.severity === 'critical' ? (lang === 'es' ? 'CRÍTICO' : 'CRITICAL') : f.severity === 'major' ? 'MAYOR' : 'MENOR'}</span>
                              <span className="font-semibold text-gray-800">{f.label || f.field}</span>
                              {f.action && <span className="text-gray-400 text-[12px]">— {f.action}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inconsistencies */}
                    {auditorResult.validation?.inconsistencies?.map((inc: any, i: number) => (
                      <div key={i} className={`p-2.5 rounded-xl border-l-3 text-[13px] ${inc.severity === 'error' ? 'bg-red-50 border-l-red-500' : 'bg-amber-50 border-l-amber-500'}`}>
                        <span className={`text-[10px] font-bold uppercase ${inc.severity === 'error' ? 'text-red-600' : 'text-amber-600'}`}>
                          {inc.severity === 'error' ? 'ERROR' : (lang === 'es' ? 'AVISO' : 'WARNING')}
                        </span>
                        <div className="mt-0.5" dangerouslySetInnerHTML={{ __html: highlightClinical(inc.finding || inc.description || '') }} />
                        {inc.suggestion && <div className="text-gray-400 text-[12px] mt-0.5">→ {inc.suggestion}</div>}
                      </div>
                    ))}

                    {/* Clinical alerts */}
                    {auditorResult.validation?.clinical_alerts?.map((alert: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl border-l-3 border-l-blue-400 bg-blue-50 text-[13px]">
                        <span className="text-[10px] font-bold uppercase text-blue-600">{lang === 'es' ? 'ALERTA CLÍNICA' : 'CLINICAL ALERT'}</span>
                        <div className="mt-0.5" dangerouslySetInnerHTML={{ __html: highlightClinical(alert.alert || '') }} />
                      </div>
                    ))}

                    {/* CIE-O coding */}
                    {auditorResult.validation?.suggested_coding && (auditorResult.validation.suggested_coding.topography || auditorResult.validation.suggested_coding.morphology) && (
                      <div className="p-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-light)]">
                        <span className="text-[10px] font-bold uppercase text-[var(--color-primary)]">
                          {lang === 'es' ? 'CODIFICACIÓN CIE-O SUGERIDA' : 'SUGGESTED ICD-O CODING'}
                        </span>
                        <div className="mt-1.5 space-y-1 text-[13px]">
                          {auditorResult.validation.suggested_coding.topography && (
                            <div>
                              <span className="text-gray-500">{lang === 'es' ? 'Topografía' : 'Topography'}:</span>
                              <span className="ml-1 font-mono font-bold text-[var(--color-primary)]">{auditorResult.validation.suggested_coding.topography}</span>
                              <span className="ml-1 text-gray-500">({auditorResult.validation.suggested_coding.topography_label})</span>
                            </div>
                          )}
                          {auditorResult.validation.suggested_coding.morphology && (
                            <div>
                              <span className="text-gray-500">{lang === 'es' ? 'Morfología' : 'Morphology'}:</span>
                              <span className="ml-1 font-mono font-bold text-[var(--color-primary)]">{auditorResult.validation.suggested_coding.morphology}</span>
                              <span className="ml-1 text-gray-500">({auditorResult.validation.suggested_coding.morphology_label})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* No issues */}
                    {(!auditorResult.validation?.missing_required?.length && !auditorResult.validation?.inconsistencies?.length && !auditorResult.validation?.clinical_alerts?.length) && (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm font-medium text-green-700">
                        ✓ {lang === 'es' ? 'Sin problemas detectados' : 'No issues detected'}
                      </div>
                    )}
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
          <div className="mt-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {t('protocol.select', lang)}
              </h2>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                {t('app.subtitle', lang)}
              </p>
            </div>
            <BodySelector lang={lang} onSelect={handleSelectProtocol} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-3">
            <div className="space-y-3">
              <ProtocolSearch lang={lang} onSelect={handleSelectProtocol} selected={protocol} />

<QuickNotes
                lang={lang}
                onPrefill={handlePrefill}
                protocolId={protocol.id}
                onOpenDictionary={() => setDictOpen(true)}
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

      <DictionaryEditor lang={lang} open={dictOpen} onClose={() => setDictOpen(false)} />
      <FormatConfig lang={lang} open={formatOpen} onClose={() => setFormatOpen(false)} />
    </div>
  )
}
