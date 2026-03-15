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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0a1628] via-[#0f2847] to-[#0F62FE] shadow-lg">
      <div className="px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 backdrop-blur rounded-lg flex items-center justify-center border border-white/20">
            <Microscope className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white">
              {t('app.title', lang)}
            </h1>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-blue-300/70">
              {lang === 'es' ? 'HUMANO EN CONTROL' : 'HUMAN-IN-THE-LOOP'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {completionPercent !== undefined && completionPercent > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${completionPercent}%`,
                    backgroundColor: completionPercent >= 80 ? '#24A148' :
                      completionPercent >= 50 ? '#F1C21B' : '#DA1E28',
                  }} />
              </div>
              <span className="text-xs font-mono text-white/80">
                {completionPercent}%
              </span>
            </div>
          )}

          {/* Language toggle */}
          <div className="flex rounded-full overflow-hidden border border-white/20">
            <button onClick={lang === 'en' ? toggleLang : undefined}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all ${lang === 'en' ? 'bg-white text-[#0a1628]' : 'text-white/60 hover:text-white'}`}>
              EN
            </button>
            <button onClick={lang === 'es' ? undefined : toggleLang}
              className={`px-2.5 py-1 text-[11px] font-bold transition-all ${lang === 'es' ? 'bg-white text-[#0a1628]' : 'text-white/60 hover:text-white'}`}>
              ES
            </button>
          </div>

          {/* Dark mode */}
          <button onClick={onDarkModeToggle} className="p-1.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors">
            {darkMode ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-white/80" />}
          </button>

          {/* Font size */}
          <div className="flex items-center rounded-full border border-white/20 overflow-hidden">
            <button onClick={() => onFontSizeChange(Math.max(12, fontSize - 1))} className="p-1 hover:bg-white/10">
              <Minus className="w-3.5 h-3.5 text-white/70" />
            </button>
            <span className="text-[11px] font-mono px-1 text-white/80">{fontSize}</span>
            <button onClick={() => onFontSizeChange(Math.min(22, fontSize + 1))} className="p-1 hover:bg-white/10">
              <Plus className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
