import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'

interface MicroscopeMascotProps {
  size?: 'small' | 'medium'
  className?: string
}

export function MicroscopeMascot({ size = 'medium', className = '' }: MicroscopeMascotProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const smoothX = useSpring(mouseX, { stiffness: 140, damping: 18, mass: 0.8 })
  const smoothY = useSpring(mouseY, { stiffness: 140, damping: 18, mass: 0.8 })

  const tiltX = useTransform(smoothY, [-1, 1], [5, -5])
  const tiltY = useTransform(smoothX, [-1, 1], [-6, 6])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!wrapRef.current) return
      const rect = wrapRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      // For small size (header): only react when mouse is nearby (within 150px)
      if (size === 'small') {
        const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2)
        if (dist > 150) {
          mouseX.set(0)
          mouseY.set(0)
          return
        }
      }

      const nx = (e.clientX - cx) / (rect.width / 2)
      const ny = (e.clientY - cy) / (rect.height / 2)
      mouseX.set(Math.max(-1, Math.min(1, nx)))
      mouseY.set(Math.max(-1, Math.min(1, ny)))
    }
    const reset = () => { mouseX.set(0); mouseY.set(0) }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseleave', reset)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', reset)
    }
  }, [mouseX, mouseY, size])

  const eyeOffsetY = useTransform(smoothY, [-1, 1], [-5, 5])
  const ocularRotate = useTransform(smoothX, [-1, 1], [-6, 6])

  // Normal: eyes follow mouse. Center (mouse between eyes): cross-eyed
  // smoothX near 0 AND smoothY near 0 = mouse is between eyes = bizco
  const leftEyeX = useTransform(smoothX, [-1, -0.2, 0, 0.2, 1], [-9, -5, 7, 8, 9])
  const rightEyeX = useTransform(smoothX, [-1, -0.2, 0, 0.2, 1], [-9, -8, -7, 5, 9])

  const s = size === 'small' ? 42 : 200

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center justify-center cursor-pointer ${className}`}
      style={{ width: s, height: s * 1.08 }}
    >
      <motion.div
        style={{ rotateX: tiltX, rotateY: tiltY }}
        animate={hovered ? { y: [0, -2, 0] } : { y: 0 }}
        transition={hovered ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : { duration: 0.3 }}
      >
        <svg width={s} height={s * 1.08} viewBox="0 0 240 260" fill="none">
          {/* Base */}
          <motion.g animate={hovered ? { rotate: [-0.5, 0.5, -0.5] } : { rotate: 0 }} transition={hovered ? { repeat: Infinity, duration: 2.6 } : { duration: 0.3 }}>
            <rect x="78" y="186" width="84" height="18" rx="9" fill="#0E6B5E" />
            <rect x="63" y="202" width="114" height="16" rx="8" fill="#0A5249" />
            <rect x="101" y="135" width="18" height="58" rx="9" fill="#0E6B5E" />
            <rect x="118" y="145" width="16" height="48" rx="8" fill="#0A5249" />
            <rect x="78" y="120" width="66" height="20" rx="10" fill="#A7CBC6" />
          </motion.g>

          {/* Arm */}
          <g>
            <rect x="103" y="72" width="22" height="64" rx="11" fill="#0E6B5E" />
            <rect x="112" y="58" width="54" height="18" rx="9" transform="rotate(28 112 58)" fill="#0A5249" />
            <circle cx="118" cy="79" r="10" fill="#065F46" />
          </g>

          {/* Head */}
          <motion.g
            animate={hovered ? { rotate: [-1, 1, -1], y: [-0.5, 0.5, -0.5] } : { rotate: 0, y: 0 }}
            transition={hovered ? { repeat: Infinity, duration: 2.3, ease: 'easeInOut' } : { duration: 0.3 }}
            style={{ originX: '118px', originY: '79px' }}
          >
            <rect x="132" y="38" width="64" height="24" rx="12" transform="rotate(28 132 38)" fill="#0E6B5E" />

            {/* Left eye — separated more */}
            <motion.g style={{ rotate: ocularRotate, originX: '140px', originY: '65px' }}>
              <circle cx="140" cy="65" r="28" fill="#0E6B5E" />
              <circle cx="140" cy="65" r="21" fill="#E6F4F1" />
              <motion.circle cx="140" cy="65" r="10" fill="#0a1628" style={{ x: leftEyeX, y: eyeOffsetY }} />
              <motion.circle cx="140" cy="65" r="4" fill="#ffffff" style={{ x: useTransform(smoothX, [-1, 1], [-1.5, 1.5]), y: useTransform(smoothY, [-1, 1], [-1, 1]) }} />
            </motion.g>

            {/* Right eye — separated more */}
            <motion.g style={{ rotate: ocularRotate, originX: '190px', originY: '88px' }}>
              <circle cx="190" cy="88" r="24" fill="#0A5249" />
              <circle cx="190" cy="88" r="18" fill="#E6F4F1" />
              <motion.circle cx="190" cy="88" r="8.5" fill="#0a1628" style={{ x: rightEyeX, y: eyeOffsetY }} />
              <motion.circle cx="190" cy="88" r="3.5" fill="#ffffff" style={{ x: useTransform(smoothX, [-1, 1], [-1.5, 1.5]), y: useTransform(smoothY, [-1, 1], [-1, 1]) }} />
            </motion.g>
          </motion.g>

          {/* Stage */}
          <g>
            <rect x="62" y="108" width="54" height="14" rx="7" fill="#0E6B5E" />
            <rect x="48" y="121" width="70" height="12" rx="6" fill="#065F46" />
            {/* Micrometer knob - fixed */}
            <circle cx="64" cy="150" r="13" fill="#0E6B5E" />
            <circle cx="64" cy="150" r="5" fill="#A7CBC6" />
            <line x1="64" y1="138" x2="64" y2="143" stroke="#A7CBC6" strokeWidth="2" />
            <line x1="64" y1="157" x2="64" y2="162" stroke="#A7CBC6" strokeWidth="2" />
            <line x1="52" y1="150" x2="57" y2="150" stroke="#A7CBC6" strokeWidth="2" />
            <line x1="71" y1="150" x2="76" y2="150" stroke="#A7CBC6" strokeWidth="2" />
          </g>

          {/* Smile */}
          <motion.path
            d="M104 161C111 167 123 167 130 161"
            stroke="#A7CBC6"
            strokeWidth="4"
            strokeLinecap="round"
            animate={hovered ? { d: ['M104 161C111 167 123 167 130 161', 'M104 163C111 170 123 170 130 163', 'M104 161C111 167 123 167 130 161'] } : { d: 'M104 161C111 167 123 167 130 161' }}
            transition={{ duration: 1.8, repeat: hovered ? Infinity : 0, ease: 'easeInOut' }}
          />
        </svg>
      </motion.div>
    </div>
  )
}
