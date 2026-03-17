import { useRef, useEffect } from 'react'

interface ParticleCanvasProps {
  count?: number
  color?: string
  className?: string
}

export function ParticleCanvas({ count = 50, color = '#0E6B5E', className = '' }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()

    const w0 = canvas.width / dpr
    const h0 = canvas.height / dpr

    // Diagonal wall: particles live only inside the bottom-right triangle.
    // The wall goes from (w*0.45, h) to (w, h*0.15).
    // A point is "inside" when it's to the right of this line.
    const wallX0 = 0.45  // bottom-left anchor  (fraction of w)
    const wallY0 = 1.0
    const wallX1 = 1.0   // top-right anchor    (fraction of w)
    const wallY1 = 0.15

    /** Returns positive value if point is inside the triangle (right of the wall) */
    const signedDist = (px: number, py: number, w: number, h: number) => {
      const ax = wallX0 * w, ay = wallY0 * h
      const bx = wallX1 * w, by = wallY1 * h
      // Cross product gives signed distance to the line AB
      return (bx - ax) * (py - ay) - (by - ay) * (px - ax)
    }

    /** Normal vector of the wall (pointing inward, into the triangle) */
    const wallNx = -(wallY1 - wallY0)  // perpendicular to AB
    const wallNy = wallX1 - wallX0
    const wallLen = Math.sqrt(wallNx * wallNx + wallNy * wallNy)
    const wnx = wallNx / wallLen
    const wny = wallNy / wallLen

    // Spawn particles inside the triangle
    const particles = Array.from({ length: count }, () => {
      let x: number, y: number
      do {
        x = w0 * 0.5 + Math.random() * w0 * 0.5
        y = h0 * 0.2 + Math.random() * h0 * 0.8
      } while (signedDist(x, y, w0, h0) < 0) // reject if outside triangle
      return {
        x, y,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 2.5 + 1.5,
      }
    })

    const threshold = 80
    let mouseX = -1000
    let mouseY = -1000
    const mouseThreshold = 120

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseX = e.clientX - rect.left
      mouseY = e.clientY - rect.top
    }
    const handleLeave = () => { mouseX = -1000; mouseY = -1000 }
    canvas.parentElement?.addEventListener('mousemove', handleMouse)
    canvas.parentElement?.addEventListener('mouseleave', handleLeave)

    const draw = () => {
      const w = canvas.width / dpr
      const h = canvas.height / dpr
      ctx.clearRect(0, 0, w, h)

      // Update positions — constrain to bottom-right triangle
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        // Bounce off canvas edges (right and bottom only matter, but keep all)
        if (p.x > w) { p.x = w; p.vx *= -1 }
        if (p.y > h) { p.y = h; p.vy *= -1 }
        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }

        // Bounce off diagonal wall — if particle crossed to the forbidden side
        const sd = signedDist(p.x, p.y, w, h)
        if (sd < 0) {
          // Push particle back onto the wall
          const correction = Math.abs(sd) / (wallLen * w) * w * 1.1
          p.x += wnx * correction
          p.y += wny * correction
          // Reflect velocity along wall normal
          const dot = p.vx * wnx + p.vy * wny
          p.vx -= 2 * dot * wnx
          p.vy -= 2 * dot * wny
          // Dampen a bit on bounce
          p.vx *= 0.7
          p.vy *= 0.7
        }
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < threshold) {
            const alpha = (1 - dist / threshold) * 0.3
            ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw cursor connections + repel
      for (const p of particles) {
        const dx = p.x - mouseX
        const dy = p.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouseThreshold && dist > 0) {
          // Repel gently
          p.vx += (dx / dist) * 0.08
          p.vy += (dy / dist) * 0.08
          // Draw connection to cursor
          const alpha = (1 - dist / mouseThreshold) * 0.4
          ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(mouseX, mouseY)
          ctx.stroke()
        }
        // Dampen velocity
        p.vx *= 0.995
        p.vy *= 0.995
      }

      // Draw particles
      for (const p of particles) {
        ctx.fillStyle = `${color}40`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }

    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.parentElement?.removeEventListener('mousemove', handleMouse)
      canvas.parentElement?.removeEventListener('mouseleave', handleLeave)
    }
  }, [count, color])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
