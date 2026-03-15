import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Trash2, X, BookOpen } from 'lucide-react'
import type { Lang } from '../data/i18n'

interface CustomRule {
  id: string
  abbreviation: string
  field: string
  value: string
}

const STORAGE_KEY = 'patho-custom-dictionary'

const FIELD_OPTIONS = [
  { value: 'histologic_type', label_es: 'Tipo histológico', label_en: 'Histologic type' },
  { value: 'histologic_grade', label_es: 'Grado histológico', label_en: 'Histologic grade' },
  { value: 'tumor_location', label_es: 'Localización tumoral', label_en: 'Tumor location' },
  { value: 'depth_of_invasion', label_es: 'Profundidad de invasión', label_en: 'Depth of invasion' },
  { value: 'lymphovascular_invasion', label_es: 'Invasión linfovascular', label_en: 'Lymphovascular invasion' },
  { value: 'perineural_invasion', label_es: 'Invasión perineural', label_en: 'Perineural invasion' },
  { value: 'mmr_msi', label_es: 'Estado MMR/MSI', label_en: 'MMR/MSI status' },
  { value: 'margins_proximal', label_es: 'Margen proximal', label_en: 'Proximal margin' },
  { value: 'margins_distal', label_es: 'Margen distal', label_en: 'Distal margin' },
]

export function getCustomRules(): CustomRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

interface DictionaryEditorProps {
  lang: Lang
  open: boolean
  onClose: () => void
}

export function DictionaryEditor({ lang, open, onClose }: DictionaryEditorProps) {
  const [rules, setRules] = useState<CustomRule[]>([])
  const [newAbbr, setNewAbbr] = useState('')
  const [newField, setNewField] = useState('histologic_type')
  const [newValue, setNewValue] = useState('')

  useEffect(() => {
    setRules(getCustomRules())
  }, [open])

  const save = (updated: CustomRule[]) => {
    setRules(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addRule = () => {
    if (!newAbbr.trim() || !newValue.trim()) return
    const rule: CustomRule = {
      id: Date.now().toString(),
      abbreviation: newAbbr.trim().toLowerCase(),
      field: newField,
      value: newValue.trim(),
    }
    save([...rules, rule])
    setNewAbbr('')
    setNewValue('')
  }

  const removeRule = (id: string) => {
    save(rules.filter(r => r.id !== id))
  }

  if (!open) return null

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {lang === 'es' ? 'Mi diccionario de abreviaciones' : 'My abbreviation dictionary'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          {/* Add new */}
          <div className="p-4 border-b border-[var(--color-surface-alt)] bg-[var(--color-surface-alt)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2">
              {lang === 'es'
                ? 'Agregue abreviaciones personalizadas. Al escribir en notas rápidas, se rellenarán automáticamente.'
                : 'Add custom abbreviations. When typing in quick notes, they will auto-fill.'}
            </p>
            <div className="flex gap-2">
              <input
                value={newAbbr}
                onChange={e => setNewAbbr(e.target.value)}
                placeholder={lang === 'es' ? 'Abreviación (ej: adeno)' : 'Abbreviation (eg: adeno)'}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg"
              />
              <select
                value={newField}
                onChange={e => setNewField(e.target.value)}
                className="px-2 py-2 text-sm border border-[var(--color-border)] rounded-lg"
              >
                {FIELD_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{lang === 'es' ? f.label_es : f.label_en}</option>
                ))}
              </select>
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder={lang === 'es' ? 'Valor' : 'Value'}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg"
              />
              <button
                onClick={addRule}
                disabled={!newAbbr.trim() || !newValue.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Rules list */}
          <div className="flex-1 overflow-y-auto p-4">
            {rules.length === 0 ? (
              <div className="text-center text-sm text-[var(--color-text-tertiary)] py-8">
                {lang === 'es' ? 'Sin abreviaciones personalizadas' : 'No custom abbreviations'}
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => {
                  const fieldLabel = FIELD_OPTIONS.find(f => f.value === rule.field)
                  return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border)] bg-white"
                    >
                      <code className="text-sm font-mono font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded">
                        {rule.abbreviation}
                      </code>
                      <span className="text-xs text-[var(--color-text-tertiary)]">→</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {lang === 'es' ? fieldLabel?.label_es : fieldLabel?.label_en}:
                      </span>
                      <span className="text-sm font-medium text-[var(--color-text)]">{rule.value}</span>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="ml-auto p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[var(--color-border)] text-center">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {lang === 'es'
                ? `${rules.length} abreviaciones personalizadas · Guardado en este navegador`
                : `${rules.length} custom abbreviations · Saved in this browser`}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
