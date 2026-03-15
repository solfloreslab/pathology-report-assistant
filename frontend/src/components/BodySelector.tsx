import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Search } from 'lucide-react'
import type { Lang } from '../data/i18n'
import type { ProtocolDef } from '../data/protocols'
import { protocols } from '../data/protocols'

interface BodySelectorProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
}

const ORGAN_GROUPS = [
  { id: 'colon', label_es: 'Colon / Recto', label_en: 'Colon / Rectum', gradient: 'from-emerald-500 to-teal-600', spotColor: 'rgba(16,185,129,0.15)', protocols: ['colon-resection'] },
  { id: 'skin', label_es: 'Piel / Melanoma', label_en: 'Skin / Melanoma', gradient: 'from-rose-500 to-pink-600', spotColor: 'rgba(244,63,94,0.15)', protocols: ['melanoma'] },
  { id: 'breast', label_es: 'Mama', label_en: 'Breast', gradient: 'from-pink-500 to-fuchsia-600', spotColor: 'rgba(236,72,153,0.15)', protocols: ['breast-biopsy'] },
  { id: 'stomach', label_es: 'Estómago', label_en: 'Stomach', gradient: 'from-amber-500 to-orange-600', spotColor: 'rgba(245,158,11,0.15)', protocols: ['gastric'] },
  { id: 'cervix', label_es: 'Cérvix', label_en: 'Cervix', gradient: 'from-red-500 to-rose-600', spotColor: 'rgba(225,29,72,0.15)', protocols: ['cytology-cervical'] },
  { id: 'brain', label_es: 'Cerebro', label_en: 'Brain', gradient: 'from-violet-400 to-purple-500', spotColor: 'rgba(139,92,246,0.1)', protocols: [] },
  { id: 'lung', label_es: 'Pulmón', label_en: 'Lung', gradient: 'from-sky-400 to-blue-500', spotColor: 'rgba(56,189,248,0.1)', protocols: [] },
  { id: 'thyroid', label_es: 'Tiroides', label_en: 'Thyroid', gradient: 'from-cyan-400 to-teal-500', spotColor: 'rgba(6,182,212,0.1)', protocols: [] },
  { id: 'kidney', label_es: 'Riñón', label_en: 'Kidney', gradient: 'from-indigo-400 to-violet-500', spotColor: 'rgba(99,102,241,0.1)', protocols: [] },
  { id: 'prostate', label_es: 'Próstata', label_en: 'Prostate', gradient: 'from-green-400 to-emerald-500', spotColor: 'rgba(34,197,94,0.1)', protocols: [] },
  { id: 'liver', label_es: 'Hígado', label_en: 'Liver', gradient: 'from-amber-600 to-orange-700', spotColor: 'rgba(180,83,9,0.1)', protocols: [] },
  { id: 'pancreas', label_es: 'Páncreas', label_en: 'Pancreas', gradient: 'from-orange-400 to-amber-500', spotColor: 'rgba(249,115,22,0.1)', protocols: [] },
]

function OrganCard({ group, lang, onSelect }: {
  group: typeof ORGAN_GROUPS[0], lang: Lang,
  onSelect: (p: ProtocolDef) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [spotPos, setSpotPos] = useState({ x: 0, y: 0 })
  const [spotOpacity, setSpotOpacity] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const hasProtocols = group.protocols.length > 0
  const groupProtocols = group.protocols
    .map(pid => protocols.find(p => p.id === pid))
    .filter(Boolean) as ProtocolDef[]

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setSpotPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleClick = () => {
    if (!hasProtocols) return
    if (groupProtocols.length === 1) {
      onSelect(groupProtocols[0])
    } else {
      setExpanded(!expanded)
    }
  }

  return (
    <motion.div
      ref={ref}
      whileHover="hovered"
      initial="idle"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setSpotOpacity(1)}
      onMouseLeave={() => { setSpotOpacity(0); setExpanded(false) }}
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl ${
        hasProtocols ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={{ minHeight: hasProtocols ? '160px' : '120px' }}
    >
      {/* Background gradient with zoom on hover */}
      <motion.div
        variants={{
          idle: { scale: 1 },
          hovered: { scale: hasProtocols ? 1.08 : 1.02 },
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`absolute inset-0 bg-gradient-to-br ${group.gradient} ${!hasProtocols ? 'opacity-30' : ''}`}
      />

      {/* Dark overlay — intensifies on hover */}
      <motion.div
        variants={{
          idle: { background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' },
          hovered: { background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.2) 100%)' },
        }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 z-10"
      />

      {/* Spotlight following cursor */}
      <div
        className="pointer-events-none absolute inset-0 z-20 rounded-2xl transition-opacity duration-500"
        style={{
          opacity: spotOpacity,
          background: `radial-gradient(300px circle at ${spotPos.x}px ${spotPos.y}px, ${group.spotColor}, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-30 flex h-full flex-col justify-end p-4">
        {/* Badge */}
        <motion.div
          variants={{
            idle: { x: -15, opacity: 0 },
            hovered: { x: 0, opacity: 1 },
          }}
          transition={{ duration: 0.3 }}
        >
          {hasProtocols ? (
            <span className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
              {groupProtocols.length} {groupProtocols.length === 1
                ? (lang === 'es' ? 'protocolo' : 'protocol')
                : (lang === 'es' ? 'protocolos' : 'protocols')}
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">
              {lang === 'es' ? 'Próximamente' : 'Coming soon'}
            </span>
          )}
        </motion.div>

        {/* Name */}
        <motion.h3
          variants={{
            idle: { y: 10, opacity: 0.9 },
            hovered: { y: 0, opacity: 1 },
          }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-1.5 text-base font-bold text-white"
        >
          {lang === 'es' ? group.label_es : group.label_en}
        </motion.h3>

        {/* Protocols list — revealed on hover */}
        <AnimatePresence>
          {hasProtocols && (
            <motion.div
              variants={{
                idle: { y: 20, opacity: 0, height: 0 },
                hovered: { y: 0, opacity: 1, height: 'auto' },
              }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1">
                {groupProtocols.map(proto => (
                  <button
                    key={proto.id}
                    onClick={(e) => { e.stopPropagation(); onSelect(proto) }}
                    className="w-full flex items-center justify-between rounded-lg bg-white/10 px-3 py-1.5 text-left backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    <div>
                      <div className="text-xs font-medium text-white">
                        {lang === 'es' ? proto.name_es : proto.name_en}
                      </div>
                      <div className="text-[9px] text-white/50">{proto.version}</div>
                    </div>
                    <ChevronRight className="w-3 h-3 text-white/50" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function BodySelector({ lang, onSelect }: BodySelectorProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? ORGAN_GROUPS.filter(g =>
        g.label_es.toLowerCase().includes(query.toLowerCase()) ||
        g.label_en.toLowerCase().includes(query.toLowerCase())
      )
    : ORGAN_GROUPS

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
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        />
      </div>

      {/* Grid of organ cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(group => (
          <OrganCard key={group.id} group={group} lang={lang} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}
