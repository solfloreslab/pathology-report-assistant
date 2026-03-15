import { useState, useEffect, useCallback } from 'react'
import { Microscope } from 'lucide-react'

export function FloatingMicroscope() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [target, setTarget] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setTarget({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // Smooth follow with lag
  useEffect(() => {
    let raf: number
    const animate = () => {
      setPos(prev => ({
        x: prev.x + (target.x - prev.x) * 0.08,
        y: prev.y + (target.y - prev.y) * 0.08,
      }))
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div
      className="fixed pointer-events-none z-0"
      style={{
        left: pos.x - 30,
        top: pos.y - 30,
        transition: 'none',
      }}
    >
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute inset-0 w-[60px] h-[60px] rounded-full bg-blue-400/10 blur-xl" />
        {/* Icon */}
        <div className="w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#0F62FE]/8 to-[#6929C4]/8 backdrop-blur-sm flex items-center justify-center border border-blue-200/20">
          <Microscope className="w-6 h-6 text-[#0F62FE]/25" />
        </div>
      </div>
    </div>
  )
}
