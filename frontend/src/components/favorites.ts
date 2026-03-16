const STORAGE_KEY = 'patho-favorites'

export function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function toggleFavorite(id: string): string[] {
  const favs = getFavorites()
  const updated = favs.includes(id)
    ? favs.filter(f => f !== id)
    : [...favs, id]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}
