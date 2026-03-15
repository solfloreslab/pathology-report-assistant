import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FormField } from './FormField'
import type { ProtocolDef, SectionId } from '../data/protocols'
import { sectionOrder } from '../data/protocols'
import type { FormValues, SectionStatus } from '../hooks/useFormState'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { getSuggestions, getReference } from '../data/staging'

interface ProtocolFormProps {
  protocol: ProtocolDef
  values: FormValues
  onChange: (fieldName: string, value: string) => void
  sectionStatuses: SectionStatus[]
  lang: Lang
  darkMode?: boolean
}

export function ProtocolForm({ protocol, values, onChange, sectionStatuses, lang, darkMode }: ProtocolFormProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const suggestions = getSuggestions(protocol.id, values)

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const sectionLabel = (sectionId: SectionId): string => {
    const key = `form.section.${sectionId}` as any
    return t(key, lang)
  }

  const statusBadge = (status: SectionStatus) => {
    if (status.status === 'complete') {
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]">✓ {status.filled}/{status.total}</span>
    }
    if (status.status === 'partial') {
      return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]">{status.filled}/{status.total}</span>
    }
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-na-bg)] text-[var(--color-na)]">0/{status.total}</span>
  }

  return (
    <div className="space-y-1.5">
      {sectionOrder.map(sectionId => {
        const fields = protocol.fields.filter(f => f.section === sectionId)
        if (fields.length === 0) return null

        const status = sectionStatuses.find(s => s.id === sectionId)
        const isCollapsed = collapsedSections.has(sectionId)

        const renderedGroups = new Set<string>()

        return (
          <div
            key={sectionId}
            id={`section-${sectionId}`}
            className={`rounded-xl border overflow-hidden card-hover shadow-sm ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-[var(--color-border)]'}`}
          >
            <button
              onClick={() => toggleSection(sectionId)}
              className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-[var(--color-surface-alt)]'}`}
            >
              <div className="flex items-center gap-2">
                {isCollapsed
                  ? <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                  : <ChevronDown className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                }
                <span className={`text-[13px] font-semibold ${darkMode ? 'text-gray-200' : 'text-[var(--color-text)]'}`}>
                  {sectionLabel(sectionId)}
                </span>
              </div>
              {status && statusBadge(status)}
            </button>

            {!isCollapsed && (
              <div className="px-3 pb-3 pt-0.5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                {fields.map(field => (
                  <FormField
                    key={field.name}
                    field={field}
                    value={values[field.name] || ''}
                    onChange={v => onChange(field.name, v)}
                    lang={lang}
                    darkMode={darkMode}
                    suggestion={suggestions.find(s => s.field === field.name)}
                    reference={getReference(protocol.id, field.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
