const KEY = 'stop-favorites'
const EMPTY: string[] = []
let cachedValue: string | null = null
let cachedFavorites = EMPTY

export const getServerFavorites = () => EMPTY

export function subscribeFavorites(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('favorites-change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('favorites-change', callback)
  }
}

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return EMPTY
  try {
    const value = localStorage.getItem(KEY) ?? '[]'
    if (value !== cachedValue) {
      const parsed: unknown = JSON.parse(value)
      cachedFavorites = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : EMPTY
      cachedValue = value
    }
    return cachedFavorites
  } catch {
    return EMPTY
  }
}

export function toggleFavorite(stopId: string): string[] {
  const favs = getFavorites()
  const next = favs.includes(stopId)
    ? favs.filter(id => id !== stopId)
    : [...favs, stopId]
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('favorites-change'))
  return next
}

export function isFavorite(stopId: string): boolean {
  return getFavorites().includes(stopId)
}
