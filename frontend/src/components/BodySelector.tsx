import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Lang } from '../data/i18n'
import type { ProtocolDef } from '../data/protocols'
import { protocols } from '../data/protocols'

interface BodySelectorProps {
  lang: Lang
  onSelect: (protocol: ProtocolDef) => void
}

const ORGANS = [
  { id: 'brain', label_es: 'Cerebro', label_en: 'Brain', x: 160, y: 78, r: 18, color: '#8B5CF6' },
  { id: 'thyroid', label_es: 'Tiroides', label_en: 'Thyroid', x: 160, y: 132, r: 10, color: '#06B6D4' },
  { id: 'breast_l', label_es: 'Mama', label_en: 'Breast', x: 132, y: 174, r: 13, color: '#EC4899' },
  { id: 'breast_r', label_es: 'Mama', label_en: 'Breast', x: 188, y: 174, r: 13, color: '#EC4899' },
  { id: 'lung_l', label_es: 'Pulmón', label_en: 'Lung', x: 143, y: 192, r: 16, color: '#38BDF8' },
  { id: 'lung_r', label_es: 'Pulmón', label_en: 'Lung', x: 177, y: 192, r: 16, color: '#38BDF8' },
  { id: 'stomach', label_es: 'Estómago', label_en: 'Stomach', x: 177, y: 240, r: 16, color: '#F59E0B' },
  { id: 'liver', label_es: 'Hígado', label_en: 'Liver', x: 142, y: 234, r: 18, color: '#B45309' },
  { id: 'pancreas', label_es: 'Páncreas', label_en: 'Pancreas', x: 161, y: 258, r: 11, color: '#F97316' },
  { id: 'colon', label_es: 'Colon / Recto', label_en: 'Colon / Rectum', x: 160, y: 300, r: 22, color: '#10B981' },
  { id: 'kidney_l', label_es: 'Riñón', label_en: 'Kidney', x: 132, y: 262, r: 11, color: '#6366F1' },
  { id: 'kidney_r', label_es: 'Riñón', label_en: 'Kidney', x: 188, y: 262, r: 11, color: '#6366F1' },
  { id: 'bladder', label_es: 'Vejiga', label_en: 'Bladder', x: 160, y: 338, r: 12, color: '#14B8A6' },
  { id: 'uterus', label_es: 'Útero / Cérvix', label_en: 'Uterus / Cervix', x: 160, y: 352, r: 12, color: '#E11D48' },
  { id: 'prostate', label_es: 'Próstata', label_en: 'Prostate', x: 160, y: 356, r: 8, color: '#22C55E' },
  { id: 'skin', label_es: 'Piel / Melanoma', label_en: 'Skin / Melanoma', x: 212, y: 118, r: 9, color: '#F43F5E' },
]

// Map protocol IDs to organ IDs
const PROTOCOL_ORGANS: Record<string, string[]> = {
  'colon-resection': ['colon'],
  'melanoma': ['skin'],
  'breast-biopsy': ['breast_l', 'breast_r'],
  'gastric': ['stomach'],
  'cytology-cervical': ['uterus'],
}

// Map organ IDs to protocol IDs
const ORGAN_PROTOCOLS: Record<string, string> = {
  colon: 'colon-resection',
  skin: 'melanoma',
  breast_l: 'breast-biopsy',
  breast_r: 'breast-biopsy',
  stomach: 'gastric',
  uterus: 'cytology-cervical',
}

// Protocols shown as cards (including coming soon)
const PROTOCOL_CARDS = [
  { id: 'colon-resection', organs: ['colon'], available: true },
  { id: 'melanoma', organs: ['skin'], available: true },
  { id: 'breast-biopsy', organs: ['breast_l', 'breast_r'], available: true },
  { id: 'gastric', organs: ['stomach'], available: true },
  { id: 'cytology-cervical', organs: ['uterus'], available: true },
  { id: 'brain', organs: ['brain'], available: false, label_es: 'Cerebro', label_en: 'Brain' },
  { id: 'lung', organs: ['lung_l', 'lung_r'], available: false, label_es: 'Pulmón', label_en: 'Lung' },
  { id: 'thyroid', organs: ['thyroid'], available: false, label_es: 'Tiroides', label_en: 'Thyroid' },
  { id: 'kidney', organs: ['kidney_l', 'kidney_r'], available: false, label_es: 'Riñón', label_en: 'Kidney' },
  { id: 'bladder', organs: ['bladder'], available: false, label_es: 'Vejiga', label_en: 'Bladder' },
  { id: 'prostate', organs: ['prostate'], available: false, label_es: 'Próstata', label_en: 'Prostate' },
  { id: 'pancreas', organs: ['pancreas'], available: false, label_es: 'Páncreas', label_en: 'Pancreas' },
  { id: 'liver', organs: ['liver'], available: false, label_es: 'Hígado', label_en: 'Liver' },
]

function BodyOutline() {
  return (
    <g stroke="#94A3B8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
      <circle cx="160" cy="74" r="34" />
      <path d="M133 112C126 124 122 139 122 154V214C122 224 128 232 138 235L146 238" />
      <path d="M187 112C194 124 198 139 198 154V214C198 224 192 232 182 235L174 238" />
      <path d="M146 238C142 266 142 298 145 332" />
      <path d="M174 238C178 266 178 298 175 332" />
      <path d="M145 332C145 352 143 372 138 400" />
      <path d="M175 332C175 352 177 372 182 400" />
      <path d="M121 158C100 173 92 196 94 220" />
      <path d="M199 158C220 173 228 196 226 220" />
      <path d="M94 220C92 244 101 262 113 277" />
      <path d="M226 220C228 244 219 262 207 277" />
      <path d="M122 146H198" />
      <path d="M130 112C142 106 151 104 160 104C169 104 178 106 190 112" />
      <path d="M145 332H175" />
    </g>
  )
}

export function BodySelector({ lang, onSelect }: BodySelectorProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null)

  const activeOrgans = useMemo(() => {
    if (hoveredOrgan) return [hoveredOrgan]
    const card = PROTOCOL_CARDS.find(p => p.id === activeCard)
    return card ? card.organs : []
  }, [activeCard, hoveredOrgan])

  const activeSet = new Set(activeOrgans)

  const handleOrganClick = (organId: string) => {
    const protocolId = ORGAN_PROTOCOLS[organId]
    if (protocolId) {
      const p = protocols.find(pr => pr.id === protocolId)
      if (p && p.available) onSelect(p)
    }
  }

  const handleCardClick = (cardId: string) => {
    const p = protocols.find(pr => pr.id === cardId)
    if (p && p.available) onSelect(p)
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 max-w-5xl mx-auto">
      {/* Cards */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PROTOCOL_CARDS.map(card => {
            const isActive = activeCard === card.id
            const proto = protocols.find(p => p.id === card.id)
            const name = proto
              ? (lang === 'es' ? proto.name_es : proto.name_en)
              : (lang === 'es' ? (card as any).label_es : (card as any).label_en)

            return (
              <motion.button
                key={card.id}
                onMouseEnter={() => setActiveCard(card.id)}
                onMouseLeave={() => setActiveCard(null)}
                onClick={() => card.available && handleCardClick(card.id)}
                whileHover={card.available ? { y: -2, scale: 1.02 } : {}}
                whileTap={card.available ? { scale: 0.98 } : {}}
                disabled={!card.available}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                  isActive && card.available
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] shadow-sm'
                    : card.available
                      ? 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]/50'
                      : 'border-dashed border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="text-sm font-semibold text-[var(--color-text)]">{name}</div>
                {proto && (
                  <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{proto.version}</div>
                )}
                {!card.available && (
                  <div className="text-[9px] font-medium text-[var(--color-na)] mt-0.5 uppercase">
                    {lang === 'es' ? 'Próximamente' : 'Coming soon'}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex justify-center">
        <div className="relative">
          <svg viewBox="0 0 320 440" className="h-[420px] w-[300px]">
            <BodyOutline />
            {ORGANS.map(organ => {
              const isActive = activeSet.has(organ.id)
              const isDimmed = activeOrgans.length > 0 && !isActive
              const hasProtocol = !!ORGAN_PROTOCOLS[organ.id]
              return (
                <g
                  key={organ.id}
                  onMouseEnter={() => setHoveredOrgan(organ.id)}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => handleOrganClick(organ.id)}
                  style={{ cursor: hasProtocol ? 'pointer' : 'default' }}
                >
                  <motion.circle
                    cx={organ.x} cy={organ.y} r={organ.r}
                    fill={organ.color}
                    initial={false}
                    animate={{
                      opacity: isActive ? 0.9 : isDimmed ? 0.1 : 0.25,
                      scale: isActive ? 1.08 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 240, damping: 18 }}
                  />
                  <AnimatePresence>
                    {isActive && (
                      <motion.circle
                        cx={organ.x} cy={organ.y} r={organ.r + 6}
                        fill={organ.color}
                        initial={{ opacity: 0.3, scale: 0.9 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, repeat: Infinity, repeatType: 'loop' }}
                      />
                    )}
                  </AnimatePresence>
                </g>
              )
            })}
          </svg>

          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[var(--color-text-tertiary)]">
            {hoveredOrgan ? (
              <span>{lang === 'es' ? ORGANS.find(o => o.id === hoveredOrgan)?.label_es : ORGANS.find(o => o.id === hoveredOrgan)?.label_en}</span>
            ) : activeCard ? (
              <span className="font-medium text-[var(--color-primary)]">
                {protocols.find(p => p.id === activeCard)
                  ? (lang === 'es' ? protocols.find(p => p.id === activeCard)?.name_es : protocols.find(p => p.id === activeCard)?.name_en)
                  : PROTOCOL_CARDS.find(c => c.id === activeCard) && (lang === 'es' ? (PROTOCOL_CARDS.find(c => c.id === activeCard) as any)?.label_es : (PROTOCOL_CARDS.find(c => c.id === activeCard) as any)?.label_en)
                }
              </span>
            ) : (
              <span>{lang === 'es' ? 'Seleccione un órgano o protocolo' : 'Select an organ or protocol'}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
