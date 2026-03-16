import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, ChevronRight, Star } from 'lucide-react'
import type { Lang } from '../data/i18n'
import type { ProtocolDef } from '../data/protocols'
import { protocols } from '../data/protocols'
import { getFavorites, toggleFavorite } from './favorites'

interface BodySelectorProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
}

const ORGAN_GROUPS = [
  { id: 'colon', label_es: 'Colon / Recto', label_en: 'Colon / Rectum', gradient: 'from-[#134E4A] to-[#0F766E]', protocols: ['colon-resection'] },
  { id: 'skin', label_es: 'Piel / Melanoma', label_en: 'Skin / Melanoma', gradient: 'from-[#134E4A] to-[#0F766E]', protocols: ['melanoma'] },
  { id: 'breast', label_es: 'Mama', label_en: 'Breast', gradient: 'from-[#134E4A] to-[#0F766E]', protocols: ['breast-biopsy'] },
  { id: 'stomach', label_es: 'Estómago', label_en: 'Stomach', gradient: 'from-[#134E4A] to-[#0F766E]', protocols: ['gastric'] },
  { id: 'cervix', label_es: 'Cérvix', label_en: 'Cervix', gradient: 'from-[#134E4A] to-[#0F766E]', protocols: ['cytology-cervical'] },
  { id: 'brain', label_es: 'Cerebro', label_en: 'Brain', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'lung', label_es: 'Pulmón', label_en: 'Lung', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'thyroid', label_es: 'Tiroides', label_en: 'Thyroid', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'kidney', label_es: 'Riñón', label_en: 'Kidney', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'prostate', label_es: 'Próstata', label_en: 'Prostate', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'liver', label_es: 'Hígado', label_en: 'Liver', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
  { id: 'pancreas', label_es: 'Páncreas', label_en: 'Pancreas', gradient: 'from-[#E2E8F0] to-[#CBD5E1]', protocols: [] },
]

export function BodySelector({ lang, onSelect }: BodySelectorProps) {
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [favs, setFavs] = useState(getFavorites)

  const handleToggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setFavs(toggleFavorite(id))
  }

  const base = query.trim()
    ? ORGAN_GROUPS.filter(g =>
        g.label_es.toLowerCase().includes(query.toLowerCase()) ||
        g.label_en.toLowerCase().includes(query.toLowerCase())
      )
    : ORGAN_GROUPS

  // Organs with favorited protocols float to the top
  const filtered = [...base].sort((a, b) => {
    const aHasFav = a.protocols.some(pid => favs.includes(pid)) ? 0 : 1
    const bHasFav = b.protocols.some(pid => favs.includes(pid)) ? 0 : 1
    return aHasFav - bHasFav
  })

  const handleClick = (group: typeof ORGAN_GROUPS[0]) => {
    const groupProtocols = group.protocols
      .map(pid => protocols.find(p => p.id === pid))
      .filter(Boolean) as ProtocolDef[]

    if (groupProtocols.length === 0) return
    if (groupProtocols.length === 1) {
      // Single protocol — expand to show it, then click enters
      setExpandedId(expandedId === group.id ? null : group.id)
    } else {
      setExpandedId(expandedId === group.id ? null : group.id)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Search */}
      <div className="relative mb-5 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={lang === 'es' ? 'Buscar órgano o protocolo...' : 'Search organ or protocol...'}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm"
        />
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((group) => {
          const hasProtocols = group.protocols.length > 0
          const isExpanded = expandedId === group.id
          const groupProtocols = group.protocols
            .map(pid => protocols.find(p => p.id === pid))
            .filter(Boolean) as ProtocolDef[]

          return (
            <motion.div
              key={group.id}
              layoutId={`card-${group.id}`}
              onClick={() => handleClick(group)}
              className={`overflow-hidden rounded-xl border cursor-pointer ${
                hasProtocols
                  ? 'border-white/10 hover:border-white/20'
                  : 'border-white/5 opacity-40 cursor-default'
              } ${isExpanded ? 'border-[var(--color-primary)]/50 shadow-lg shadow-[var(--color-primary)]/5' : ''}`}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Card header with gradient */}
              <div className={`flex items-center gap-4 p-4 bg-gradient-to-br ${group.gradient}`}>
                <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-white/10 flex-shrink-0">
                  <div className="w-4 h-4 rounded-full bg-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm">
                    {lang === 'es' ? group.label_es : group.label_en}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {hasProtocols
                      ? `${groupProtocols.length} ${groupProtocols.length === 1 ? (lang === 'es' ? 'protocolo' : 'protocol') : (lang === 'es' ? 'protocolos' : 'protocols')}`
                      : (lang === 'es' ? 'Próximamente' : 'Coming soon')
                    }
                  </p>
                </div>
                {hasProtocols && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex w-7 h-7 items-center justify-center rounded-full bg-white/10"
                  >
                    <span className="text-sm text-white/60">+</span>
                  </motion.div>
                )}
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {isExpanded && hasProtocols && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { type: 'spring', stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className={`border-t border-white/5 px-4 pb-4 pt-3 bg-gradient-to-br ${group.gradient}`}>
                      <div className="space-y-2">
                        {groupProtocols.map((proto, i) => {
                          const isFav = favs.includes(proto.id)
                          return (
                            <motion.button
                              key={proto.id}
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: i * 0.1, duration: 0.3 }}
                              onClick={(e) => { e.stopPropagation(); onSelect(proto) }}
                              className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-left"
                            >
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {lang === 'es' ? proto.name_es : proto.name_en}
                                </div>
                                <div className="text-[10px] text-white/40">
                                  {proto.version} · {proto.fields.length} {lang === 'es' ? 'campos' : 'fields'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleToggleFav(e, proto.id)}
                                  className="p-1 rounded-md hover:bg-white/10 transition-colors"
                                >
                                  <Star className={`w-4 h-4 transition-colors ${
                                    isFav
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-white/30 hover:text-amber-400'
                                  }`} />
                                </button>
                                <ChevronRight className="w-4 h-4 text-white/40" />
                              </div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
