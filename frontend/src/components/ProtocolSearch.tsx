import { useState, useMemo } from 'react'
import { Search, ChevronRight, Star } from 'lucide-react'
import { protocols } from '../data/protocols'
import type { ProtocolDef } from '../data/protocols'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { getFavorites, toggleFavorite } from './favorites'

interface ProtocolSearchProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
  selected: ProtocolDef | null
}

export function ProtocolSearch({ lang, onSelect, selected }: ProtocolSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(!selected)
  const [favs, setFavs] = useState(getFavorites)

  const handleToggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFavs(toggleFavorite(id))
  }

  const filtered = useMemo(() => {
    let list = protocols.slice()
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(p =>
        p.name_en.toLowerCase().includes(q) ||
        p.name_es.toLowerCase().includes(q) ||
        p.organ_en.toLowerCase().includes(q) ||
        p.organ_es.toLowerCase().includes(q) ||
        p.id.includes(q)
      )
    }
    // Favorites first
    list.sort((a, b) => {
      const af = favs.includes(a.id) ? 0 : 1
      const bf = favs.includes(b.id) ? 0 : 1
      return af - bf
    })
    return list
  }, [query, favs])

  if (!open && selected) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{selected.icon}</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-[var(--color-text)]">
              {lang === 'es' ? selected.name_es : selected.name_en}
            </div>
            <div className="text-xs text-[var(--color-text-tertiary)]">{selected.version}</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
      </button>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      <div className="p-3 border-b border-[var(--color-surface-alt)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('protocol.search', lang)}
            autoFocus
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-border-input)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {filtered.map((p, i) => {
          const isFav = favs.includes(p.id)
          // Show divider between favorites and non-favorites
          const prevIsFav = i > 0 && favs.includes(filtered[i - 1].id)
          const showDivider = !isFav && prevIsFav

          return (
            <div key={p.id}>
              {showDivider && (
                <div className="border-t-2 border-dashed border-[var(--color-border)] mx-3" />
              )}
              <button
                onClick={() => {
                  if (p.available) {
                    onSelect(p)
                    setOpen(false)
                    setQuery('')
                  }
                }}
                disabled={!p.available}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors border-b border-[var(--color-surface-alt)] last:border-b-0 ${
                  p.available
                    ? 'hover:bg-[var(--color-primary-light)] cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                } ${selected?.id === p.id ? 'bg-[var(--color-primary-light)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{p.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-text)]">
                      {lang === 'es' ? p.name_es : p.name_en}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      {lang === 'es' ? p.organ_es : p.organ_en} · {p.version}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!p.available && (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[var(--color-na-bg)] text-[var(--color-na)]">
                      {t('protocol.coming', lang)}
                    </span>
                  )}
                  {p.available && (
                    <button
                      onClick={(e) => handleToggleFav(e, p.id)}
                      className="p-1 rounded-md hover:bg-[var(--color-surface-alt)] transition-colors"
                    >
                      <Star className={`w-4 h-4 transition-colors ${
                        isFav
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[var(--color-text-tertiary)] hover:text-amber-400'
                      }`} />
                    </button>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
