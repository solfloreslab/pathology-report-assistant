import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import type { StagingReference, StagingSuggestion } from '../data/staging'
import type { Lang } from '../data/i18n'

interface StagingPopupProps {
  reference: StagingReference
  suggestion?: StagingSuggestion
  lang: Lang
  darkMode?: boolean
}

export function StagingPopup({ reference, suggestion, lang, darkMode }: StagingPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const matchStage = suggestion?.value?.split(' ')[0]

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded-full transition-colors ${
          darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-primary)]'
        }`}
        title={lang === 'es' ? 'Ver tabla de referencia' : 'View reference table'}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setIsOpen(false)} />
          <div className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-96 rounded-xl shadow-2xl border ${
            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-[var(--color-border)]'
          }`}>
            <div className={`flex items-center justify-between px-3 py-2 border-b ${
              darkMode ? 'border-gray-700' : 'border-[var(--color-border)]'
            }`}>
              <div>
                <h3 className={`text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-[var(--color-text)]'}`}>
                  {lang === 'es' ? reference.title_es : reference.title_en}
                </h3>
                <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>
                  {reference.source}
                </span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-0.5">
                <X className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-400' : 'text-[var(--color-text-tertiary)]'}`} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {reference.entries.map(entry => {
                const isMatch = matchStage === entry.stage
                return (
                  <div
                    key={entry.stage}
                    className={`flex gap-2 px-3 py-1.5 text-xs border-l-[3px] ${
                      isMatch
                        ? 'border-l-[var(--color-primary)] bg-[var(--color-info-bg)]'
                        : darkMode
                          ? 'border-l-transparent hover:bg-gray-750'
                          : 'border-l-transparent hover:bg-[var(--color-surface-alt)]'
                    }`}
                  >
                    <span className={`font-mono font-bold w-12 flex-shrink-0 ${
                      isMatch ? 'text-[var(--color-primary)]' : darkMode ? 'text-gray-300' : 'text-[var(--color-text)]'
                    }`}>
                      {entry.stage}
                    </span>
                    <span className={`${
                      isMatch
                        ? 'text-[var(--color-info-text)] font-medium'
                        : darkMode ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {lang === 'es' ? entry.criteria_es : entry.criteria_en}
                      {isMatch && (
                        <span className="ml-1 text-[var(--color-primary)] font-bold">
                          {lang === 'es' ? ' ← tu caso' : ' ← your case'}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
