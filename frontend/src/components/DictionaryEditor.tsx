import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, BookOpen, Save, RotateCcw, Info } from 'lucide-react'
import type { Lang } from '../data/i18n'

interface CustomRule {
  id: string
  abbreviation: string
  field: string
  value: string
}

const STORAGE_KEY = 'patho-custom-dictionary'

export function getCustomRules(): CustomRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

/** Serialize rules array → textarea text (one pair per line, tab-separated) */
function rulesToText(rules: CustomRule[]): string {
  return rules.map(r => `${r.abbreviation}\t${r.value}`).join('\n')
}

/** Parse textarea text → rules array */
function textToRules(text: string): CustomRule[] {
  const rules: CustomRule[] = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue // skip empty & comments

    // Split by tab, → , or multiple spaces
    const parts = trimmed.split(/\t|→|➜|->|  +/)
    if (parts.length >= 2) {
      const abbr = parts[0].trim().toLowerCase()
      const val = parts.slice(1).join(' ').trim()
      if (abbr && val) {
        rules.push({
          id: `custom-${abbr}-${Date.now()}-${rules.length}`,
          abbreviation: abbr,
          field: 'custom',
          value: val,
        })
      }
    }
  }
  return rules
}

interface DictionaryEditorProps {
  lang: Lang
  open: boolean
  onClose: () => void
}

export function DictionaryEditor({ lang, open, onClose }: DictionaryEditorProps) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const [parsedCount, setParsedCount] = useState(0)

  // Load from localStorage on open
  useEffect(() => {
    if (open) {
      const rules = getCustomRules()
      setText(rules.length > 0 ? rulesToText(rules) : '')
      setParsedCount(rules.length)
      setSaved(false)
    }
  }, [open])

  // Live parse count
  useEffect(() => {
    const rules = textToRules(text)
    setParsedCount(rules.length)
  }, [text])

  const handleSave = useCallback(() => {
    const rules = textToRules(text)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [text])

  const handleReset = useCallback(() => {
    setText('')
    setParsedCount(0)
  }, [])

  if (!open) return null

  const es = lang === 'es'

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {es ? 'Mi Diccionario' : 'My Dictionary'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Explanation */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20">
              <Info className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" />
              <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                <p className="font-medium text-[var(--color-text)] mb-1">
                  {es
                    ? 'Escriba sus abreviaciones personalizadas, una por línea.'
                    : 'Write your custom abbreviations, one per line.'}
                </p>
                <p>
                  {es
                    ? 'Separe la abreviación del significado con tabulación, → o varios espacios. Al escribir en notas rápidas, se reconocerán automáticamente.'
                    : 'Separate the abbreviation from its meaning with a tab, → or multiple spaces. When typing in quick notes, they will be recognized automatically.'}
                </p>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <div className="flex-1 px-5 py-3 min-h-0">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              spellCheck={false}
              placeholder={[
                es ? '# Ejemplo (las líneas con # se ignoran):' : '# Example (lines with # are ignored):',
                'adeno\tAdenocarcinoma',
                'mod\tModeradamente diferenciado',
                's/pni\tSin invasión perineural',
                'ILV+\tInvasión linfovascular presente',
                'marg lib\tMárgenes libres de neoplasia',
              ].join('\n')}
              className="w-full h-full min-h-[240px] px-4 py-3 text-sm font-mono leading-relaxed border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none transition-all"
              style={{ tabSize: 20 }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {parsedCount > 0 ? (
                  <span className="text-[var(--color-primary)] font-medium">
                    {parsedCount} {es ? 'abreviaciones reconocidas' : 'abbreviations recognized'}
                  </span>
                ) : (
                  es ? 'Sin abreviaciones aún' : 'No abbreviations yet'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {es ? 'Limpiar' : 'Clear'}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saved
                  ? (es ? '¡Guardado!' : 'Saved!')
                  : (es ? 'Guardar' : 'Save')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
