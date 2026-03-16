import { useState } from 'react'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'
import { MicroscopeMascot } from './MicroscopeMascot'
import { ParticleCanvas } from './ParticleCanvas'

interface AccessScreenProps {
  lang: Lang
  toggleLang: () => void
  onLogin: (code: string) => boolean
}

export function AccessScreen({ lang, toggleLang, onLogin }: AccessScreenProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const success = onLogin(code)
    if (!success) {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #E6F4F1 0%, #F7F8FA 50%, #EDF5FF 100%)' }}>
      {/* Particle constellation — bottom right */}
      <div className="absolute bottom-0 right-0 w-[60%] h-[60%] opacity-60">
        <ParticleCanvas count={50} color="#0E6B5E" />
      </div>
      <div className="w-full max-w-sm relative z-10">
        {/* Microscope with parallax */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex justify-center mb-6"
        >
          <MicroscopeMascot size="medium" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-center mb-6"
        >
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {t('app.title', lang)}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
            {t('app.subtitle', lang)}
          </p>
        </motion.div>

        {/* Login card with glassmorphism */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 shadow-lg border border-white/40"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            <label className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider">
              {t('access.title', lang)}
            </label>
          </div>
          <input
            type="password"
            value={code}
            onChange={e => { setCode(e.target.value); setError(false) }}
            placeholder={t('access.placeholder', lang)}
            autoFocus
            className={`w-full px-4 py-3 text-sm border rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all ${
              error ? 'border-[var(--color-critical)] ring-2 ring-[var(--color-critical)] animate-[shake_0.3s]' : 'border-[var(--color-border)]'
            }`}
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[var(--color-critical)] mt-2"
            >
              {t('access.error', lang)}
            </motion.p>
          )}
          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-all hover:shadow-lg active:scale-[0.98]"
          >
            {t('access.submit', lang)}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.form>

        {/* Language toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-5"
        >
          <button
            onClick={toggleLang}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
          >
            {lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-5"
        >
          {t('footer.disclaimer', lang)}
        </motion.p>
      </div>
    </div>
  )
}
