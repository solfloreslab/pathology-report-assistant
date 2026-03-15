import { useState, useCallback } from 'react'
import type { Lang } from '../data/i18n'

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('patho-lang') as Lang) || 'es'
  })

  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'es' ? 'en' : 'es'
      localStorage.setItem('patho-lang', next)
      return next
    })
  }, [])

  return { lang, toggleLang }
}
