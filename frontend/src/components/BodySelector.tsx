import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Search } from 'lucide-react'
import type { Lang } from '../data/i18n'
import type { ProtocolDef } from '../data/protocols'
import { protocols } from '../data/protocols'

interface BodySelectorProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
}

const ORGAN_GROUPS = [
  { id: 'colon', label_es: 'Colon / Recto', label_en: 'Colon / Rectum', accent: '#0E6B5E', protocols: ['colon-resection'] },
  { id: 'skin', label_es: 'Piel / Melanoma', label_en: 'Skin / Melanoma', accent: '#9F1239', protocols: ['melanoma'] },
  { id: 'breast', label_es: 'Mama', label_en: 'Breast', accent: '#BE185D', protocols: ['breast-biopsy'] },
  { id: 'stomach', label_es: 'Estómago', label_en: 'Stomach', accent: '#B45309', protocols: ['gastric'] },
  { id: 'cervix', label_es: 'Cérvix', label_en: 'Cervix', accent: '#9F1239', protocols: ['cytology-cervical'] },
  { id: 'brain', label_es: 'Cerebro', label_en: 'Brain', accent: '#6D28D9', protocols: [] },
  { id: 'lung', label_es: 'Pulmón', label_en: 'Lung', accent: '#0369A1', protocols: [] },
  { id: 'thyroid', label_es: 'Tiroides', label_en: 'Thyroid', accent: '#0E7490', protocols: [] },
  { id: 'kidney', label_es: 'Riñón', label_en: 'Kidney', accent: '#4338CA', protocols: [] },
  { id: 'prostate', label_es: 'Próstata', label_en: 'Prostate', accent: '#15803D', protocols: [] },
  { id: 'liver', label_es: 'Hígado', label_en: 'Liver', accent: '#92400E', protocols: [] },
  { id: 'pancreas', label_es: 'Páncreas', label_en: 'Pancreas', accent: '#C2410C', protocols: [] },
]

export function BodySelector({ lang, onSelect }: BodySelectorProps) {
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = query.trim()
    ? ORGAN_GROUPS.filter(g =>
        g.label_es.toLowerCase().includes(query.toLowerCase()) ||
        g.label_en.toLowerCase().includes(query.toLowerCase())
      )
    : ORGAN_GROUPS

  const handleCardClick = (group: typeof ORGAN_GROUPS[0]) => {
    const groupProtocols = group.protocols
      .map(pid => protocols.find(p => p.id === pid))
      .filter(Boolean) as ProtocolDef[]

    if (groupProtocols.length === 0) return
    if (groupProtocols.length === 1) {
      onSelect(groupProtocols[0])
    } else {
      setExpandedId(expandedId === group.id ? null : group.id)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search */}
      <div className="relative mb-6 max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={lang === 'es' ? 'Buscar órgano o protocolo...' : 'Search organ or protocol...'}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent shadow-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((group) => {
          const hasProtocols = group.protocols.length > 0
          const isExpanded = expandedId === group.id
          const groupProtocols = group.protocols
            .map(pid => protocols.find(p => p.id === pid))
            .filter(Boolean) as ProtocolDef[]

          return (
            <motion.div
              key={group.id}
              layout
              onClick={() => handleCardClick(group)}
              className={`rounded-xl border bg-white overflow-hidden transition-shadow ${
                hasProtocols
                  ? 'cursor-pointer hover:shadow-lg border-[var(--color-border)] hover:border-gray-300'
                  : 'border-dashed border-gray-200'
              } ${isExpanded ? 'shadow-lg border-gray-300 col-span-2 row-span-2' : ''}`}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="p-4 flex items-center gap-3">
                {/* Color accent dot */}
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${!hasProtocols ? 'opacity-25' : ''}`}
                  style={{ backgroundColor: group.accent }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${hasProtocols ? 'text-[var(--color-text)]' : 'text-gray-400'}`}>
                    {lang === 'es' ? group.label_es : group.label_en}
                  </h3>
                  {hasProtocols ? (
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                      {groupProtocols.length} {groupProtocols.length === 1
                        ? (lang === 'es' ? 'protocolo disponible' : 'protocol available')
                        : (lang === 'es' ? 'protocolos disponibles' : 'protocols available')}
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">
                      {lang === 'es' ? 'Próximamente' : 'Coming soon'}
                    </p>
                  )}
                </div>
                {hasProtocols && groupProtocols.length > 1 && (
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  </motion.div>
                )}
                {hasProtocols && groupProtocols.length === 1 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: group.accent + '15' }}>
                    <span className="text-xs" style={{ color: group.accent }}>→</span>
                  </div>
                )}
              </div>

              {/* Colored bottom border */}
              <div className="h-[3px]" style={{ backgroundColor: hasProtocols ? group.accent : 'transparent', opacity: hasProtocols ? 0.6 : 0 }} />

              {/* Expanded protocols */}
              <AnimatePresence>
                {isExpanded && groupProtocols.length > 0 && (
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
                    <div className="px-4 pb-4 pt-2 space-y-2 border-t border-[var(--color-surface-alt)]">
                      {groupProtocols.map((proto, i) => (
                        <motion.button
                          key={proto.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={(e) => { e.stopPropagation(); onSelect(proto) }}
                          className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-alt)] hover:bg-[var(--color-primary-light)] transition-colors text-left group/proto"
                        >
                          <div>
                            <div className="text-sm font-medium text-[var(--color-text)] group-hover/proto:text-[var(--color-primary)]">
                              {lang === 'es' ? proto.name_es : proto.name_en}
                            </div>
                            <div className="text-[10px] text-[var(--color-text-tertiary)]">
                              {proto.version} · {proto.fields.length} {lang === 'es' ? 'campos' : 'fields'}
                            </div>
                          </div>
                          <span className="text-xs text-[var(--color-primary)] opacity-0 group-hover/proto:opacity-100 transition-opacity">
                            {lang === 'es' ? 'Abrir →' : 'Open →'}
                          </span>
                        </motion.button>
                      ))}
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
