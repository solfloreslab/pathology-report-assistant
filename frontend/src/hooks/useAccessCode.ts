import { useState, useCallback } from 'react'

const STORAGE_KEY = 'patho-access'

export function useAccessCode() {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  })

  const login = useCallback((code: string): boolean => {
    // Validation happens server-side. Here we just store the code
    // and mark as authenticated for the session
    if (code.trim().length > 0) {
      sessionStorage.setItem(STORAGE_KEY, 'true')
      sessionStorage.setItem('patho-code', code.trim())
      setAuthenticated(true)
      return true
    }
    return false
  }, [])

  const getCode = useCallback((): string => {
    return sessionStorage.getItem('patho-code') || ''
  }, [])

  return { authenticated, login, getCode }
}
