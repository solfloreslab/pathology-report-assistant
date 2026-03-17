import { useState, useCallback } from 'react'
import { Microscope } from 'lucide-react'

export function AnimatedLogo() {
  const [hovering, setHovering] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setLook({ x, y })
  }, [])

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setLook({ x: 0, y: 0 }) }}
      onMouseMove={handleMouseMove}
      className="w-9 h-9 bg-gradient-to-br from-[var(--color-primary)] to-[#065F46] rounded-xl flex items-center justify-center cursor-pointer shadow-lg relative"
      style={{
        transform: `perspective(200px) rotateX(${-look.y * 8}deg) rotateY(${look.x * 8}deg) scale(${hovering ? 1.1 : 1})`,
        transition: 'transform 0.2s ease-out',
      }}
    >
      <Microscope
        className="w-5 h-5 text-white drop-shadow-sm"
        style={{
          transform: `translate(${look.x * 2}px, ${look.y * 2}px)`,
          transition: 'transform 0.15s ease-out',
        }}
      />
    </div>
  )
}
