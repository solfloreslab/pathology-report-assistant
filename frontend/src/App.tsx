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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export default function App() {
  const { lang, toggleLang } = useLang()
  const { authenticated, login, getCode } = useAccessCode()
  const [protocol, setProtocol] = useState<ProtocolDef | null>(null)
  const [includeMacro, setIncludeMacro] = useState(false)
  const [fontSize, setFontSize] = useState(15)
  const [darkMode, setDarkMode] = useState(false)

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
      />

      <main className="mx-auto px-[10px] py-3" style={{ maxWidth: 'calc(100vw - 20px)' }}>
        {!protocol ? (
          <div className="max-w-lg mx-auto mt-12">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold">{t('protocol.select', lang)}</h2>
              <p className="text-sm opacity-70 mt-1">{t('app.subtitle', lang)}</p>
            </div>
            <ProtocolSearch lang={lang} onSelect={handleSelectProtocol} selected={null} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[40%_1fr] gap-3">
            <div className="space-y-3">
              <ProtocolSearch lang={lang} onSelect={handleSelectProtocol} selected={protocol} />

              <label className="flex items-center gap-2 text-xs opacity-70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMacro}
                  onChange={e => setIncludeMacro(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                {t('form.include_macro', lang)}
              </label>

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
              <div className="lg:sticky lg:top-[60px]">
                <ReportPreview
                  protocol={protocol}
                  values={values}
                  lang={lang}
                  includeMacro={includeMacro}
                  completionPercent={completionPercent}
                  pendingFields={pendingFields}
                  sectionStatuses={sectionStatuses}
                  accessCode={getCode()}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className={`mt-auto py-3 text-center border-t ${darkMode ? 'border-gray-800' : 'border-[var(--color-border)]'}`}>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] opacity-50">
          <span>{t('footer.disclaimer', lang)}</span>
          <span>·</span>
          <span>{t('footer.synthetic', lang)}</span>
          <span>·</span>
          <a href="https://github.com/solfloreslab/pathology-report-agent" target="_blank" rel="noopener" className="text-[var(--color-primary)] hover:underline">GitHub</a>
          <span>·</span>
          <span>{t('footer.built', lang)}</span>
        </div>
      </footer>
    </div>
  )
}
