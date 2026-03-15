import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Settings2 } from 'lucide-react'
import type { Lang } from '../data/i18n'

export interface FormatRules {
  sectionHeaders: 'uppercase' | 'bold' | 'normal'
  diagnosisStyle: 'uppercase' | 'bold' | 'normal'
  fieldValues: 'bold' | 'normal'
  margins: 'inline' | 'list'
}

const STORAGE_KEY = 'patho-format-config'

const defaultRules: FormatRules = {
  sectionHeaders: 'uppercase',
  diagnosisStyle: 'bold',
  fieldValues: 'normal',
  margins: 'inline',
}

export function getFormatRules(): FormatRules {
  try {
    return { ...defaultRules, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  } catch { return defaultRules }
}

interface FormatConfigProps {
  lang: Lang
  open: boolean
  onClose: () => void
}

export function FormatConfig({ lang, open, onClose }: FormatConfigProps) {
  const [rules, setRules] = useState<FormatRules>(defaultRules)

  useEffect(() => {
    setRules(getFormatRules())
  }, [open])

  const update = (key: keyof FormatRules, value: string) => {
    const updated = { ...rules, [key]: value }
    setRules(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  if (!open) return null

  const options = (field: keyof FormatRules, choices: { value: string; label_es: string; label_en: string }[]) => (
    <div className="flex gap-1.5">
      {choices.map(c => (
        <button
          key={c.value}
          onClick={() => update(field, c.value)}
          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
            rules[field] === c.value
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-white border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
          }`}
        >
          {lang === 'es' ? c.label_es : c.label_en}
        </button>
      ))}
    </div>
  )

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
                {lang === 'es' ? 'Formato del informe' : 'Report format'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          <div className="p-4 space-y-5">
            {/* Section headers */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1.5">
                {lang === 'es' ? 'Títulos de sección' : 'Section headers'}
              </label>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">
                {lang === 'es' ? 'Ej: DESCRIPCIÓN MICROSCÓPICA / Descripción microscópica' : 'E.g.: MICROSCOPIC DESCRIPTION / Microscopic description'}
              </p>
              {options('sectionHeaders', [
                { value: 'uppercase', label_es: 'MAYÚSCULAS', label_en: 'UPPERCASE' },
                { value: 'bold', label_es: 'Negrita', label_en: 'Bold' },
                { value: 'normal', label_es: 'Normal', label_en: 'Normal' },
              ])}
            </div>

            {/* Diagnosis */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1.5">
                {lang === 'es' ? 'Diagnóstico' : 'Diagnosis'}
              </label>
              {options('diagnosisStyle', [
                { value: 'uppercase', label_es: 'MAYÚSCULAS', label_en: 'UPPERCASE' },
                { value: 'bold', label_es: 'Negrita', label_en: 'Bold' },
                { value: 'normal', label_es: 'Normal', label_en: 'Normal' },
              ])}
            </div>

            {/* Field values */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1.5">
                {lang === 'es' ? 'Valores de campos' : 'Field values'}
              </label>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">
                {lang === 'es' ? 'Ej: Adenocarcinoma vs adenocarcinoma' : 'E.g.: Adenocarcinoma vs adenocarcinoma'}
              </p>
              {options('fieldValues', [
                { value: 'bold', label_es: 'Negrita', label_en: 'Bold' },
                { value: 'normal', label_es: 'Normal', label_en: 'Normal' },
              ])}
            </div>

            {/* Margins style */}
            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1.5">
                {lang === 'es' ? 'Márgenes' : 'Margins'}
              </label>
              {options('margins', [
                { value: 'inline', label_es: 'En línea (Proximal: 3cm; Distal: 5cm)', label_en: 'Inline' },
                { value: 'list', label_es: 'Lista (uno por línea)', label_en: 'List (one per line)' },
              ])}
            </div>
          </div>

          <div className="p-3 border-t border-[var(--color-border)] text-center">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {lang === 'es' ? 'Guardado automáticamente en este navegador' : 'Auto-saved in this browser'}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
