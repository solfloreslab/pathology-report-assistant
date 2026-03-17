import { useState, useCallback } from 'react'

const STORAGE_KEY = 'patho-access'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

export function useAccessCode() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  const login = useCallback(async (code: string): Promise<boolean> => {
    if (!code.trim()) return false
    try {
      const res = await fetch(`${API_URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code.trim() }),
      })
      if (res.status === 401 || res.status === 403) return false
      localStorage.setItem(STORAGE_KEY, 'true')
      localStorage.setItem('patho-code', code.trim())
      setAuthenticated(true)
      return true
    } catch {
      // If Worker unreachable, allow access (offline mode)
      localStorage.setItem(STORAGE_KEY, 'true')
      localStorage.setItem('patho-code', code.trim())
      setAuthenticated(true)
      return true
    }
  }, [])

  const getCode = useCallback((): string => {
    return localStorage.getItem('patho-code') || ''
  }, [])

  return { authenticated, login, getCode }
}
