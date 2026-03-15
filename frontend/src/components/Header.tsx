import { t } from '../data/i18n'
import type { Lang } from '../data/i18n'
import { Microscope, Plus, Minus, Moon, Sun } from 'lucide-react'

interface HeaderProps {
  lang: Lang
  toggleLang: () => void
  completionPercent?: number
  fontSize: number
  onFontSizeChange: (size: number) => void
  darkMode: boolean
  onDarkModeToggle: () => void
}

export function Header({ lang, toggleLang, completionPercent, fontSize, onFontSizeChange, darkMode, onDarkModeToggle }: HeaderProps) {
  return (
    <header className={`border-b sticky top-0 z-50 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-[var(--color-border)]'}`}>
      <div className="px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <Microscope className="w-4 h-4 text-white" />
          </div>
          <h1 className={`text-sm font-semibold leading-tight ${darkMode ? 'text-gray-100' : 'text-[var(--color-text)]'}`}>
            {t('app.title', lang)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {completionPercent !== undefined && completionPercent > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-20 h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: completionPercent >= 80 ? 'var(--color-success)' :
                      completionPercent >= 50 ? 'var(--color-warning)' : 'var(--color-critical)',
                  }} />
              </div>
              <span className={`text-xs font-mono ${darkMode ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'}`}>
                {completionPercent}%
              </span>
            </div>
          )}

          {/* Font size */}
          <div className={`flex items-center border rounded ${darkMode ? 'border-gray-600' : 'border-[var(--color-border)]'}`}>
            <button onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))} className="p-1 hover:bg-black/10 rounded-l">
              <Minus className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-300' : ''}`} />
            </button>
            <span className={`text-[11px] font-mono px-1 ${darkMode ? 'text-gray-400' : 'text-[var(--color-text-secondary)]'}`}>{fontSize}</span>
            <button onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))} className="p-1 hover:bg-black/10 rounded-r">
              <Plus className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-300' : ''}`} />
            </button>
          </div>

          {/* Dark mode */}
          <button onClick={onDarkModeToggle} className={`p-1.5 rounded border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
            {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language */}
          <button onClick={toggleLang}
            className={`px-2.5 py-1 text-xs font-semibold rounded border ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>
      </div>
    </header>
  )
}
