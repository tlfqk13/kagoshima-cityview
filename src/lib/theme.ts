const KEY = 'theme-preference'

export type Theme = 'light' | 'dark' | 'system'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch { return 'system' }
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  window.dispatchEvent(new Event('theme-change'))
}

export function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener('theme-change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('theme-change', callback)
  }
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme)
  document.documentElement.setAttribute('data-theme', resolved)
}
