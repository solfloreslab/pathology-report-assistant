import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'

interface QuickNotesProps {
  lang: Lang
  onPrefill: (notes: string) => Promise<void>
}

export function QuickNotes({ lang, onPrefill }: QuickNotesProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePrefill = async () => {
    if (!notes.trim() || loading) return
    setLoading(true)
    try {
      await onPrefill(notes)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-[var(--color-primary)] border-opacity-40 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
        <span className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider">
          {t('notes.title', lang)}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder={t('notes.placeholder', lang)}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)] resize-none"
      />
      <button
        onClick={handlePrefill}
        disabled={!notes.trim() || loading}
        className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('notes.processing', lang)}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {t('notes.prefill', lang)}
          </>
        )}
      </button>
    </div>
  )
}
