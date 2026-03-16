import { useState, useCallback } from 'react'
import { Sparkles, Loader2, MessageSquareText, X, BookOpen } from 'lucide-react'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { parseNotes } from '../data/dictionary'

interface QuickNotesProps {
  lang: Lang
  onPrefill: (notes: string) => Promise<void>
  onRealtimeParse?: (matches: { field: string; value: string }[]) => void
  protocolId?: string
  onOpenDictionary?: () => void
}

const examplesByProtocol: Record<string, { es: string; en: string }> = {
  'colon-resection': {
    es: 'ej: sigmoide adeno mod G2 s/perineural 2/18 gang marg 3cm ILV+ MMR conservado',
    en: 'e.g.: sigmoid adeno mod G2 no perineural 2/18 nodes marg 3cm LVI+ MMR proficient',
  },
  'melanoma': {
    es: 'ej: espalda MES Breslow 1.8 Clark IV ulcerado 3 mit/mm2 s/ILV s/neurotropismo borde lat 3mm prof 2mm',
    en: 'e.g.: back SSM Breslow 1.8 Clark IV ulcerated 3 mit/mm2 no LVI no neurotropism lat margin 3mm deep 2mm',
  },
  'breast-biopsy': {
    es: 'ej: CDI G2 Nottingham 6 RE+ RP+ HER2 1+ Ki67 15% 1.8cm marg libres 2/3 gang',
    en: 'e.g.: IDC G2 Nottingham 6 ER+ PR+ HER2 1+ Ki67 15% 1.8cm margins clear 2/3 nodes',
  },
  'gastric': {
    es: 'ej: antro adeno intestinal G2 submucosa 3/22 gang ILV+ s/perineural HER2 2+ MMR intacto',
    en: 'e.g.: antrum adeno intestinal G2 submucosa 3/22 nodes LVI+ no perineural HER2 2+ MMR intact',
  },
  'cytology-cervical': {
    es: 'ej: escamoso HPV-asociado G2 2.5cm invasión estromal 8mm s/ILV parametrio libre',
    en: 'e.g.: squamous HPV-associated G2 2.5cm stromal invasion 8mm no LVI parametrium clear',
  },
}

export function QuickNotes({ lang, onPrefill, onRealtimeParse, protocolId, onOpenDictionary }: QuickNotesProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const handleChange = useCallback((text: string) => {
    setNotes(text)
    if (protocolId && onRealtimeParse && text.trim()) {
      const matches = parseNotes(protocolId, text)
      setMatchCount(matches.length)
      if (matches.length > 0) {
        onRealtimeParse(matches)
      }
    } else {
      setMatchCount(0)
    }
  }, [protocolId, onRealtimeParse])

  const handlePrefill = async () => {
    if (!notes.trim() || loading) return
    setLoading(true)
    try {
      await onPrefill(notes)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-all bg-white"
      >
        <MessageSquareText className="w-4 h-4" />
        {lang === 'es' ? 'Texto libre' : 'Free text'}
      </button>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-dashed border-[var(--color-primary)] border-opacity-40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider">
            {t('notes.title', lang)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onOpenDictionary && (
            <button
              onClick={onOpenDictionary}
              className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {lang === 'es' ? 'Mi diccionario' : 'My dictionary'}
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-[var(--color-text-tertiary)] mb-1 italic">
        {(protocolId && examplesByProtocol[protocolId])
          ? examplesByProtocol[protocolId][lang]
          : (lang === 'es'
            ? 'ej: escriba notas abreviadas del caso'
            : 'e.g.: write abbreviated case notes')}
      </p>
      <textarea
        value={notes}
        onChange={e => handleChange(e.target.value)}
        placeholder={lang === 'es' ? 'Escriba sus notas aquí...' : 'Write your notes here...'}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-[var(--color-border-input)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)] resize-y"
      />
      {matchCount > 0 && (
        <div className="flex items-center gap-1 mt-1 mb-1">
          <span className="text-[11px] font-medium text-[var(--color-success)]">
            {matchCount} {lang === 'es' ? 'campos detectados en tiempo real' : 'fields detected in real-time'}
          </span>
        </div>
      )}
      <button
        onClick={handlePrefill}
        disabled={!notes.trim() || loading}
        className={`mt-2 flex items-center justify-center gap-2 py-2 px-4 text-white text-sm font-semibold rounded-lg transition-all ${
          loading ? 'bg-green-600 animate-pulse cursor-wait' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-40 disabled:cursor-not-allowed'
        }`}
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
