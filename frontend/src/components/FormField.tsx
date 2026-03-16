import { useState, useEffect } from 'react'
import { TriStateControl } from './TriStateControl'
import { StagingPopup } from './StagingPopup'
import type { FieldDef } from '../data/protocols'
import type { Lang } from '../data/i18n'
import type { StagingSuggestion, StagingReference } from '../data/staging'
import { ChevronDown, Lightbulb } from 'lucide-react'

/** Get/set preferred unit for a field from localStorage */
function getPreferredUnit(fieldName: string, defaultUnit: string): string {
  try {
    const prefs = JSON.parse(localStorage.getItem('patho-unit-prefs') || '{}')
    return prefs[fieldName] || defaultUnit
  } catch { return defaultUnit }
}
function setPreferredUnit(fieldName: string, unit: string) {
  try {
    const prefs = JSON.parse(localStorage.getItem('patho-unit-prefs') || '{}')
    prefs[fieldName] = unit
    localStorage.setItem('patho-unit-prefs', JSON.stringify(prefs))
  } catch { /* ignore */ }
}

interface FormFieldProps {
  field: FieldDef
  value: string
  onChange: (value: string) => void
  lang: Lang
  darkMode?: boolean
  suggestion?: StagingSuggestion
  reference?: StagingReference | null
}

export function FormField({ field, value, onChange, lang, darkMode, suggestion, reference }: FormFieldProps) {
  // Show cm/mm toggle on: number fields with cm/mm unit, OR text fields for margins/size
  const isDistanceField = (field.unit === 'cm' || field.unit === 'mm')
    || /margin|margen|size|tamaño/i.test(field.name)
  const hasUnitToggle = isDistanceField && (field.type === 'number' || field.type === 'text')
  const defaultUnit = field.unit === 'mm' ? 'mm' : 'cm'

  const [activeUnit, setActiveUnit] = useState(defaultUnit)

  // Sync from localStorage on mount
  useEffect(() => {
    if (hasUnitToggle) {
      setActiveUnit(getPreferredUnit(field.name, defaultUnit))
    }
  }, [field.name])

  const handleUnitToggle = (e: React.MouseEvent, unit: string) => {
    e.preventDefault()
    e.stopPropagation()
    setPreferredUnit(field.name, unit)
    setActiveUnit(unit)
  }
  const label = lang === 'es' ? field.label_es : field.label_en
  const isFilled = value !== '' && value !== undefined
  const borderColor = isFilled ? 'border-[var(--color-success)]' :
    field.severity === 'critical' ? 'border-[var(--color-critical)]' :
    field.severity === 'major' ? 'border-[var(--color-major)]' : 'border-[var(--color-border)]'
  const severityLabel = field.severity === 'critical'
    ? (lang === 'es' ? 'Obligatorio' : 'Required')
    : field.severity === 'major'
    ? (lang === 'es' ? 'Mayor' : 'Major')
    : (lang === 'es' ? 'Menor' : 'Minor')
  const severityClass = field.severity === 'critical' ? 'text-[var(--color-critical)]' :
    field.severity === 'major' ? 'text-[var(--color-major)]' : 'text-[var(--color-text-tertiary)]'

  const inputBase = `w-full px-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-surface)] border-[var(--color-border-input)] text-[var(--color-text)] border`

  return (
    <div className={`flex flex-col gap-1 pl-2.5 border-l-[3px] ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label className={`text-[13px] font-medium ${darkMode ? 'text-gray-300' : 'text-[var(--color-text-secondary)]'}`}>
            {label}
            {field.unit && !hasUnitToggle && <span className={`ml-1 ${darkMode ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>({field.unit})</span>}
            {hasUnitToggle && activeUnit && <span className={`ml-1 ${darkMode ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`}>({activeUnit})</span>}
          </label>
          {reference && <StagingPopup reference={reference} suggestion={suggestion} lang={lang} darkMode={darkMode} />}
        </div>
        <span className={`text-[10px] font-semibold uppercase tracking-wide ${severityClass}`}>
          {severityLabel}
        </span>
      </div>

      {suggestion && !value && (
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
          darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-[var(--color-info-bg)] text-[var(--color-info-text)]'
        }`}>
          <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{lang === 'es' ? 'Sugerencia' : 'Suggestion'}: <strong>{suggestion.value}</strong></span>
          <span className="opacity-70">({lang === 'es' ? suggestion.reasoning_es : suggestion.reasoning_en})</span>
          <button
            onClick={() => onChange(suggestion.value)}
            className={`ml-auto px-2 py-0.5 rounded text-[10px] font-semibold ${
              darkMode ? 'bg-blue-800 hover:bg-blue-700 text-blue-200' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white'
            }`}
          >
            {lang === 'es' ? 'Aceptar' : 'Accept'}
          </button>
        </div>
      )}

      {field.type === 'tristate' && (
        <TriStateControl value={value} onChange={onChange} lang={lang} darkMode={darkMode} />
      )}

      {field.type === 'dropdown' && field.options && (
        <div className="relative">
          <select value={value || ''} onChange={e => onChange(e.target.value)} className={`${inputBase} appearance-none pr-8`}>
            <option value="">—</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {lang === 'es' ? opt.label_es : opt.label_en}
              </option>
            ))}
          </select>
          <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-gray-500' : 'text-[var(--color-text-tertiary)]'}`} />
        </div>
      )}

      {field.type === 'text' && (
        <div className="flex items-center gap-1.5">
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
            placeholder={lang === 'es' ? 'Introducir valor' : 'Enter value'} className={inputBase} />
          {hasUnitToggle && (
            <div className={`flex rounded-lg overflow-hidden border shrink-0 ${darkMode ? 'border-gray-600' : 'border-[var(--color-border)]'}`}>
              {['cm', 'mm'].map(u => (
                <button
                  type="button"
                  key={u}
                  onClick={(e) => handleUnitToggle(e, u)}
                  className={`px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    activeUnit === u
                      ? 'bg-[var(--color-primary)] text-white'
                      : (darkMode ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]')
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {field.type === 'number' && (
        <div className="flex items-center gap-1.5">
          <input type="text" inputMode="decimal" value={value || ''}
            onChange={e => { if (/^\d*[.,]?\d*$/.test(e.target.value)) onChange(e.target.value) }}
            placeholder="—" className={inputBase} />
          {hasUnitToggle && (
            <div className={`flex rounded-lg overflow-hidden border shrink-0 ${darkMode ? 'border-gray-600' : 'border-[var(--color-border)]'}`}>
              {['cm', 'mm'].map(u => (
                <button
                  type="button"
                  key={u}
                  onClick={(e) => handleUnitToggle(e, u)}
                  className={`px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    activeUnit === u
                      ? 'bg-[var(--color-primary)] text-white'
                      : (darkMode ? 'bg-gray-800 text-gray-400 hover:text-gray-200' : 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]')
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
