import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, BookOpen, Save, RotateCcw, Info, Check, AlertTriangle } from 'lucide-react'
import type { Lang } from '../data/i18n'
import { protocols } from '../data/protocols'
import type { FieldDef, DropdownOption } from '../data/protocols'

// ─── Types ───

interface CustomRule {
  id: string
  abbreviation: string
  field: string
  value: string
}

interface ParsedLine {
  abbreviation: string
  expansion: string
  matched: boolean
  fieldLabel: string       // Human-readable field name (or "" if unmatched)
  optionLabel: string      // Human-readable option label (or expansion if unmatched)
  rule: CustomRule
}

const STORAGE_KEY = 'patho-custom-dictionary'

export function getCustomRules(): CustomRule[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

// ─── Fuzzy matching engine ───

/** Normalize text for comparison: lowercase, strip accents, trim */
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

/** Score how well `input` matches `candidate`. Higher = better. 0 = no match. */
function matchScore(input: string, candidate: string): number {
  const a = normalize(input)
  const b = normalize(candidate)
  if (a === b) return 100                     // Exact
  if (b.startsWith(a)) return 90              // Prefix
  if (b.includes(a)) return 70                // Substring
  if (a.length > 3 && b.includes(a.slice(0, -1))) return 50  // Fuzzy (1 char off)
  return 0
}

/** Tristate field matching: detect present/absent/not_evaluated from natural text */
function matchTristate(expansion: string): string | null {
  const n = normalize(expansion)
  const presentWords = ['presente', 'present', 'positiv', 'si', 'yes', 'identified', 'identificad']
  const absentWords = ['ausente', 'absent', 'negativ', 'no', 'sin ', 'not identified', 'no identificad', 'not_evaluated']
  const neWords = ['no evaluad', 'not evaluated', 'ne', 'n/e', 'indeterminad', 'cannot be determined']

  for (const w of neWords) if (n.includes(w)) return 'not_evaluated'
  for (const w of absentWords) if (n.includes(w)) return 'absent'
  for (const w of presentWords) if (n.includes(w)) return 'present'
  return null
}

interface FuzzyResult {
  field: string
  value: string
  fieldLabel: string
  optionLabel: string
}

/** Find the best matching field+value for a user expansion text */
function fuzzyMatch(expansion: string, fields: FieldDef[], lang: Lang): FuzzyResult | null {
  const labelKey = lang === 'es' ? 'label_es' : 'label_en'
  let bestScore = 0
  let bestResult: FuzzyResult | null = null

  for (const field of fields) {
    // Dropdown fields: match against option labels
    if (field.type === 'dropdown' && field.options) {
      for (const opt of field.options) {
        const score = Math.max(
          matchScore(expansion, opt.label_es),
          matchScore(expansion, opt.label_en),
          matchScore(expansion, opt.value)
        )
        if (score > bestScore) {
          bestScore = score
          bestResult = {
            field: field.name,
            value: opt.value,
            fieldLabel: field[labelKey],
            optionLabel: opt[labelKey],
          }
        }
      }
    }

    // Tristate fields: match present/absent/NE
    if (field.type === 'tristate') {
      const tsValue = matchTristate(expansion)
      if (tsValue) {
        // Also check if the expansion mentions this field's name
        const fieldScore = Math.max(
          matchScore(expansion, field.label_es),
          matchScore(expansion, field.label_en),
          matchScore(expansion, field.name.replace(/_/g, ' '))
        )
        // Tristate gets a base score of 40 (lower than dropdown exact matches)
        // but boosted if the expansion mentions the field name
        const score = 40 + fieldScore
        if (score > bestScore) {
          bestScore = score
          const tsLabels: Record<string, Record<string, string>> = {
            present: { es: 'Presente', en: 'Present' },
            absent: { es: 'Ausente', en: 'Absent' },
            not_evaluated: { es: 'No evaluado', en: 'Not evaluated' },
          }
          bestResult = {
            field: field.name,
            value: tsValue,
            fieldLabel: field[labelKey],
            optionLabel: tsLabels[tsValue]?.[lang] || tsValue,
          }
        }
      }
    }
  }

  // Only return if score is meaningful
  return bestScore >= 40 ? bestResult : null
}

// ─── Textarea parsing ───

function parseLine(line: string): { abbreviation: string; expansion: string } | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const parts = trimmed.split(/\t|→|➜|->|  +/)
  if (parts.length < 2) return null
  const abbreviation = parts[0].trim().toLowerCase()
  const expansion = parts.slice(1).join(' ').trim()
  if (!abbreviation || !expansion) return null
  return { abbreviation, expansion }
}

function rulesToText(rules: CustomRule[]): string {
  // Reconstruct from stored rules — show abbreviation + the original expansion
  // We store field+value internally, but display the user-friendly text
  return rules.map(r => `${r.abbreviation}\t${r.value}`).join('\n')
}

// ─── Component ───

interface DictionaryEditorProps {
  lang: Lang
  open: boolean
  onClose: () => void
  protocolId?: string
}

export function DictionaryEditor({ lang, open, onClose, protocolId }: DictionaryEditorProps) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)

  // Get fields for active protocol
  const fields = useMemo(() => {
    if (!protocolId) return []
    const proto = protocols.find(p => p.id === protocolId)
    return proto?.fields || []
  }, [protocolId])

  // Parse all lines with fuzzy matching
  const parsed = useMemo((): ParsedLine[] => {
    const results: ParsedLine[] = []
    for (const line of text.split('\n')) {
      const p = parseLine(line)
      if (!p) continue

      const match = fields.length > 0 ? fuzzyMatch(p.expansion, fields, lang) : null
      results.push({
        abbreviation: p.abbreviation,
        expansion: p.expansion,
        matched: match !== null,
        fieldLabel: match?.fieldLabel || '',
        optionLabel: match?.optionLabel || p.expansion,
        rule: {
          id: `custom-${p.abbreviation}-${results.length}`,
          abbreviation: p.abbreviation,
          field: match?.field || 'custom',
          value: match?.value || p.expansion,
        },
      })
    }
    return results
  }, [text, fields, lang])

  const matchedCount = parsed.filter(p => p.matched).length
  const unmatchedCount = parsed.filter(p => !p.matched).length

  // Load from localStorage on open
  useEffect(() => {
    if (open) {
      const rules = getCustomRules()
      setText(rules.length > 0 ? rulesToText(rules) : '')
      setSaved(false)
    }
  }, [open])

  const handleSave = useCallback(() => {
    const rules = parsed.map(p => p.rule)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [parsed])

  const handleReset = useCallback(() => {
    setText('')
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
              <h2 className="text-base font-bold text-[var(--color-text)]">
                {es ? 'Mi Diccionario' : 'My Dictionary'}
              </h2>
              {protocolId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium">
                  {protocols.find(p => p.id === protocolId)?.[es ? 'name_es' : 'name_en'] || protocolId}
                </span>
              )}
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
                    ? 'Use tabulación para separar la abreviación del significado. El sistema detecta automáticamente a qué campo del formulario corresponde cada entrada.'
                    : 'Use tab to separate the abbreviation from its meaning. The system automatically detects which form field each entry corresponds to.'}
                </p>
              </div>
            </div>
          </div>

          {/* Split view: textarea + preview */}
          <div className="flex-1 flex gap-0 min-h-0 px-5 py-3">
            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                spellCheck={false}
                placeholder={[
                  es ? '# Ejemplo (líneas con # se ignoran):' : '# Example (# lines are ignored):',
                  'adeno\tAdenocarcinoma',
                  'mod\tModeradamente diferenciado',
                  'ILV+\tInvasión linfovascular presente',
                  's/pni\tInvasión perineural ausente',
                ].join('\n')}
                className="w-full h-full min-h-[220px] px-4 py-3 text-sm font-mono leading-relaxed border border-[var(--color-border)] rounded-l-xl bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] resize-none transition-all"
                style={{ tabSize: 20 }}
              />
            </div>

            {/* Preview panel */}
            <div className="w-[280px] shrink-0 border border-l-0 border-[var(--color-border)] rounded-r-xl bg-[var(--color-surface-alt)] overflow-y-auto">
              {parsed.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-[var(--color-text-tertiary)] p-4 text-center">
                  {es
                    ? 'Escriba abreviaciones a la izquierda para ver el mapeo automático'
                    : 'Type abbreviations on the left to see auto-mapping'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {parsed.map((p, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                        p.matched
                          ? 'bg-[var(--color-severity-green)]/8 border border-[var(--color-severity-green)]/20'
                          : 'bg-[var(--color-severity-orange)]/8 border border-[var(--color-severity-orange)]/20'
                      }`}
                    >
                      {p.matched ? (
                        <Check className="w-3.5 h-3.5 text-[var(--color-severity-green)] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-severity-orange)] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono font-bold text-[var(--color-primary)]">{p.abbreviation}</code>
                          <span className="text-[var(--color-text-tertiary)]">→</span>
                          <span className="font-medium text-[var(--color-text)] truncate">{p.optionLabel}</span>
                        </div>
                        {p.matched ? (
                          <span className="text-[10px] text-[var(--color-severity-green)]">
                            {p.fieldLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--color-severity-orange)]">
                            {es ? 'Sin mapeo — solo texto' : 'No mapping — text only'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]">
            <div className="flex items-center gap-3 text-xs">
              {parsed.length > 0 && (
                <>
                  <span className="flex items-center gap-1 text-[var(--color-severity-green)]">
                    <Check className="w-3 h-3" />
                    {matchedCount} {es ? 'mapeadas' : 'mapped'}
                  </span>
                  {unmatchedCount > 0 && (
                    <span className="flex items-center gap-1 text-[var(--color-severity-orange)]">
                      <AlertTriangle className="w-3 h-3" />
                      {unmatchedCount} {es ? 'sin mapeo' : 'unmapped'}
                    </span>
                  )}
                </>
              )}
              {parsed.length === 0 && (
                <span className="text-[var(--color-text-tertiary)]">
                  {es ? 'Sin abreviaciones aún' : 'No abbreviations yet'}
                </span>
              )}
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
                disabled={parsed.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-50 transition-colors"
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
