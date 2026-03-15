import { t } from '../data/i18n'
import type { Lang } from '../data/i18n'

interface TriStateControlProps {
  value: string
  onChange: (value: string) => void
  lang: Lang
  darkMode?: boolean
}

export function TriStateControl({ value, onChange, lang, darkMode }: TriStateControlProps) {
  const options = [
    { key: 'present', color: 'bg-[var(--color-major-bg)] text-[var(--color-major-text)] border-[var(--color-major)]' },
    { key: 'absent', color: 'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success)]' },
    { key: 'ne', color: 'bg-[var(--color-na-bg)] text-[var(--color-na)] border-[var(--color-na)]' },
  ] as const

  return (
    <div className="flex gap-1">
      {options.map(opt => {
        const isSelected = value === opt.key
        const label = opt.key === 'present' ? t('tristate.present', lang) :
                     opt.key === 'absent' ? t('tristate.absent', lang) :
                     t('tristate.ne', lang)
        return (
          <button
            key={opt.key}
            onClick={() => onChange(isSelected ? '' : opt.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              isSelected
                ? opt.color + ' border-current'
                : darkMode
                  ? 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-400'
                  : 'bg-white text-[var(--color-text-tertiary)] border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
