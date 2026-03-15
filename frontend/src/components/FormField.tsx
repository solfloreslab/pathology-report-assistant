import { TriStateControl } from './TriStateControl'
import type { FieldDef } from '../data/protocols'
import type { Lang } from '../data/i18n'
import { ChevronDown } from 'lucide-react'

interface FormFieldProps {
  field: FieldDef
  value: string
  onChange: (value: string) => void
  lang: Lang
}

export function FormField({ field, value, onChange, lang }: FormFieldProps) {
  const label = lang === 'es' ? field.label_es : field.label_en
  const severityDot = field.severity === 'critical' ? 'bg-[var(--color-critical)]' :
                      field.severity === 'major' ? 'bg-[var(--color-major)]' : 'bg-[var(--color-na)]'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${severityDot} flex-shrink-0`} />
        <label className="text-[13px] font-medium text-[var(--color-text-secondary)]">
          {label}
          {field.unit && <span className="text-[var(--color-text-tertiary)] ml-1">({field.unit})</span>}
        </label>
      </div>

      {field.type === 'tristate' && (
        <TriStateControl value={value} onChange={onChange} lang={lang} />
      )}

      {field.type === 'dropdown' && field.options && (
        <div className="relative">
          <select
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-1.5 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)]"
          >
            <option value="">—</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'es' ? opt.label_es : opt.label_en}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
        </div>
      )}

      {field.type === 'text' && (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="w-full px-3 py-1.5 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)]"
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          min="0"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="w-full px-3 py-1.5 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      )}
    </div>
  )
}
