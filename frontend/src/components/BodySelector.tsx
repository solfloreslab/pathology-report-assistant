import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, ChevronRight } from 'lucide-react'
import type { Lang } from '../data/i18n'
import type { ProtocolDef } from '../data/protocols'
import { protocols } from '../data/protocols'

interface BodySelectorProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
}

const ORGAN_GROUPS = [
  { id: 'colon', label_es: 'Colon / Recto', label_en: 'Colon / Rectum', accent: '#0E6B5E', icon: '🫁', protocols: ['colon-resection'] },
  { id: 'skin', label_es: 'Piel / Melanoma', label_en: 'Skin / Melanoma', accent: '#7A5B52', icon: '🔬', protocols: ['melanoma'] },
  { id: 'breast', label_es: 'Mama', label_en: 'Breast', accent: '#8B6B7B', icon: '🎗️', protocols: ['breast-biopsy'] },
  { id: 'stomach', label_es: 'Estómago', label_en: 'Stomach', accent: '#8B7A4A', icon: '🫃', protocols: ['gastric'] },
  { id: 'cervix', label_es: 'Cérvix', label_en: 'Cervix', accent: '#7B4A5E', icon: '🔍', protocols: ['cytology-cervical'] },
  { id: 'brain', label_es: 'Cerebro', label_en: 'Brain', accent: '#5E6B7B', icon: '🧠', protocols: [] },
  { id: 'lung', label_es: 'Pulmón', label_en: 'Lung', accent: '#4A6B7B', icon: '🫁', protocols: [] },
  { id: 'thyroid', label_es: 'Tiroides', label_en: 'Thyroid', accent: '#4A7B6B', icon: '🦋', protocols: [] },
  { id: 'kidney', label_es: 'Riñón', label_en: 'Kidney', accent: '#5B4A7B', icon: '🫘', protocols: [] },
  { id: 'prostate', label_es: 'Próstata', label_en: 'Prostate', accent: '#4A7B5B', icon: '♂️', protocols: [] },
  { id: 'liver', label_es: 'Hígado', label_en: 'Liver', accent: '#7B5B4A', icon: '🫀', protocols: [] },
  { id: 'pancreas', label_es: 'Páncreas', label_en: 'Pancreas', accent: '#7B6B4A', icon: '🔶', protocols: [] },
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

  const handleClick = (group: typeof ORGAN_GROUPS[0]) => {
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
    <div className="max-w-3xl mx-auto">
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

      {/* Accordion cards */}
      <div className="space-y-2">
        {filtered.map((group) => {
          const hasProtocols = group.protocols.length > 0
          const isExpanded = expandedId === group.id
          const groupProtocols = group.protocols
            .map(pid => protocols.find(p => p.id === pid))
            .filter(Boolean) as ProtocolDef[]

          return (
            <motion.div
              key={group.id}
              layoutId={`organ-${group.id}`}
              onClick={() => handleClick(group)}
              className={`overflow-hidden rounded-xl border transition-all ${
                hasProtocols
                  ? 'cursor-pointer bg-[#1e293b] border-[#334155] hover:border-[#475569] hover:shadow-lg'
                  : 'bg-[#1e293b]/40 border-[#334155]/40 cursor-default'
              } ${isExpanded ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10' : ''}`}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3.5 px-4 py-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${!hasProtocols ? 'opacity-30' : ''}`}
                  style={{ backgroundColor: group.accent + '25' }}
                >
                  {group.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${hasProtocols ? 'text-white' : 'text-white/30'}`}>
                    {lang === 'es' ? group.label_es : group.label_en}
                  </h3>
                  {hasProtocols ? (
                    <p className="text-[11px] text-white/40">
                      {groupProtocols.length} {groupProtocols.length === 1
                        ? (lang === 'es' ? 'protocolo' : 'protocol')
                        : (lang === 'es' ? 'protocolos' : 'protocols')}
                    </p>
                  ) : (
                    <p className="text-[10px] text-white/20 italic">
                      {lang === 'es' ? 'Próximamente' : 'Coming soon'}
                    </p>
                  )}
                </div>
                {hasProtocols && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex w-7 h-7 items-center justify-center rounded-full bg-white/5"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                  </motion.div>
                )}
              </div>

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
                    <div className="border-t border-white/5 px-4 pb-3 pt-2 space-y-1.5">
                      {groupProtocols.map((proto, i) => (
                        <motion.button
                          key={proto.id}
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.08 }}
                          onClick={(e) => { e.stopPropagation(); onSelect(proto) }}
                          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group/proto"
                        >
                          <div>
                            <div className="text-sm font-medium text-white group-hover/proto:text-[var(--color-primary)]">
                              {lang === 'es' ? proto.name_es : proto.name_en}
                            </div>
                            <div className="text-[10px] text-white/40">
                              {proto.version} · {proto.fields.length} {lang === 'es' ? 'campos' : 'fields'}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover/proto:text-[var(--color-primary)]" />
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
