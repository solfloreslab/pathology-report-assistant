import { useState } from 'react'
import { Microscope, ArrowRight } from 'lucide-react'
import type { Lang } from '../data/i18n'
import { t } from '../data/i18n'

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
    <div className="min-h-screen bg-[var(--color-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Microscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            {t('app.title', lang)}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {t('app.subtitle', lang)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <label className="block text-xs font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider mb-2">
            {t('access.title', lang)}
          </label>
          <input
            type="password"
            value={code}
            onChange={e => { setCode(e.target.value); setError(false) }}
            placeholder={t('access.placeholder', lang)}
            autoFocus
            className={`w-full px-4 py-3 text-sm border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${
              error ? 'border-[var(--color-critical)] ring-2 ring-[var(--color-critical)]' : 'border-[var(--color-border-input)]'
            }`}
          />
          {error && (
            <p className="text-xs text-[var(--color-critical)] mt-2">{t('access.error', lang)}</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {t('access.submit', lang)}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={toggleLang}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            {lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          </button>
        </div>

        <p className="text-center text-[10px] text-[var(--color-text-tertiary)] mt-6">
          {t('footer.disclaimer', lang)}
        </p>
      </div>
    </div>
  )
}
