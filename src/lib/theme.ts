const KEY = 'theme-preference'

export type Theme = 'light' | 'dark' | 'system'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  return (localStorage.getItem(KEY) as Theme) ?? 'system'
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
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
