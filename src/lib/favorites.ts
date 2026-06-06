const KEY = 'stop-favorites'

export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function toggleFavorite(stopId: string): string[] {
  const favs = getFavorites()
  const next = favs.includes(stopId)
    ? favs.filter(id => id !== stopId)
    : [...favs, stopId]
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function isFavorite(stopId: string): boolean {
  return getFavorites().includes(stopId)
}
