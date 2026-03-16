import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Settings2, Bold, Italic, Underline, CaseSensitive, Eye } from 'lucide-react'
import type { Lang } from '../data/i18n'

// ─── Types ───

interface SectionFormat {
  bold: boolean
  italic: boolean
  uppercase: boolean
  underline: boolean
}

export interface FormatRules {
  sectionHeaders: SectionFormat
  diagnosis: SectionFormat
  fieldValues: SectionFormat
  margins: 'inline' | 'list'
}

const STORAGE_KEY = 'patho-format-config'

const defaultRules: FormatRules = {
  sectionHeaders: { bold: true, italic: false, uppercase: true, underline: false },
  diagnosis: { bold: true, italic: false, uppercase: false, underline: false },
  fieldValues: { bold: false, italic: false, uppercase: false, underline: false },
  margins: 'inline',
}

export function getFormatRules(): FormatRules {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      sectionHeaders: { ...defaultRules.sectionHeaders, ...stored.sectionHeaders },
      diagnosis: { ...defaultRules.diagnosis, ...stored.diagnosis },
      fieldValues: { ...defaultRules.fieldValues, ...stored.fieldValues },
      margins: stored.margins || defaultRules.margins,
    }
  } catch { return defaultRules }
}

// ─── Component ───

interface FormatConfigProps {
  lang: Lang
  open: boolean
  onClose: () => void
}

export function FormatConfig({ lang, open, onClose }: FormatConfigProps) {
  const [rules, setRules] = useState<FormatRules>(defaultRules)

  useEffect(() => {
    if (open) setRules(getFormatRules())
  }, [open])

  const save = (updated: FormatRules) => {
    setRules(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const toggleFlag = (section: 'sectionHeaders' | 'diagnosis' | 'fieldValues', flag: keyof SectionFormat) => {
    const updated = {
      ...rules,
      [section]: { ...rules[section], [flag]: !rules[section][flag] },
    }
    save(updated)
  }

  const setMargins = (value: 'inline' | 'list') => {
    save({ ...rules, margins: value })
  }

  if (!open) return null

  const es = lang === 'es'

  /** Render preview text with applied formatting */
  const preview = (fmt: SectionFormat, text: string) => {
    let t = text
    if (fmt.uppercase) t = t.toUpperCase()
    return (
      <span className={`${fmt.bold ? 'font-bold' : ''} ${fmt.italic ? 'italic' : ''} ${fmt.underline ? 'underline' : ''}`}>
        {t}
      </span>
    )
  }

  /** Render toggle checkboxes for a section */
  const formatToggles = (section: 'sectionHeaders' | 'diagnosis' | 'fieldValues') => {
    const fmt = rules[section]
    const checks: { flag: keyof SectionFormat; label_es: string; label_en: string; icon: React.ReactNode }[] = [
      { flag: 'bold', label_es: 'Negrita', label_en: 'Bold', icon: <Bold className="w-3.5 h-3.5" /> },
      { flag: 'italic', label_es: 'Cursiva', label_en: 'Italic', icon: <Italic className="w-3.5 h-3.5" /> },
      { flag: 'uppercase', label_es: 'MAYÚSCULAS', label_en: 'UPPERCASE', icon: <CaseSensitive className="w-3.5 h-3.5" /> },
      { flag: 'underline', label_es: 'Subrayado', label_en: 'Underline', icon: <Underline className="w-3.5 h-3.5" /> },
    ]
    return (
      <div className="flex gap-1.5">
        {checks.map(c => (
          <button
            key={c.flag}
            onClick={() => toggleFlag(section, c.flag)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
              fmt[c.flag]
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
            }`}
          >
            {c.icon}
            {es ? c.label_es : c.label_en}
          </button>
        ))}
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {es ? 'Formato del informe' : 'Report format'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-4 space-y-5">
            {/* Section headers */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
                {es ? 'Títulos de sección' : 'Section headers'}
              </label>
              <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[var(--color-text-tertiary)]">
                <Eye className="w-3 h-3" />
                {preview(rules.sectionHeaders, es ? 'Descripción microscópica' : 'Microscopic description')}
              </div>
              {formatToggles('sectionHeaders')}
            </div>

            {/* Diagnosis */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
                {es ? 'Diagnóstico' : 'Diagnosis'}
              </label>
              <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[var(--color-text-tertiary)]">
                <Eye className="w-3 h-3" />
                {preview(rules.diagnosis, es ? 'Diagnóstico' : 'Diagnosis')}
              </div>
              {formatToggles('diagnosis')}
            </div>

            {/* Field values */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
                {es ? 'Valores de campos' : 'Field values'}
              </label>
              <div className="flex items-center gap-1.5 mb-2 text-[11px] text-[var(--color-text-tertiary)]">
                <Eye className="w-3 h-3" />
                {preview(rules.fieldValues, 'Adenocarcinoma NOS')}
              </div>
              {formatToggles('fieldValues')}
            </div>

            {/* Margins style */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1.5">
                {es ? 'Márgenes' : 'Margins'}
              </label>
              <div className="flex gap-1.5">
                {([
                  { value: 'inline' as const, label_es: 'En línea', label_en: 'Inline' },
                  { value: 'list' as const, label_es: 'Lista (uno por línea)', label_en: 'List (one per line)' },
                ]).map(c => (
                  <button
                    key={c.value}
                    onClick={() => setMargins(c.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      rules.margins === c.value
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {es ? c.label_es : c.label_en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[var(--color-border)] text-center">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {es ? 'Guardado automáticamente en este navegador' : 'Auto-saved in this browser'}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
