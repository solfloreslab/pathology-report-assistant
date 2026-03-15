import { useState, useCallback } from 'react'
import { Microscope } from 'lucide-react'

export function AnimatedLogo() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20
    setTilt({ x, y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
  }, [])

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-9 h-9 bg-gradient-to-br from-[#0F62FE] to-[#6929C4] rounded-xl flex items-center justify-center cursor-pointer shadow-lg shadow-blue-500/20"
      style={{
        transform: `perspective(100px) rotateX(${-tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      <Microscope className="w-5 h-5 text-white drop-shadow-sm" />
    </div>
  )
}
