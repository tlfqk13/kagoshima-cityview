'use client'
import { useEffect, useSyncExternalStore, createContext, useContext } from 'react'
import { getStoredTheme, setStoredTheme, applyTheme, subscribeTheme, type Theme } from '@/lib/theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getStoredTheme, () => 'system' as Theme)

  useEffect(() => {
    applyTheme(theme)

    // Listen for system changes when theme is 'system'
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (getStoredTheme() === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme])

  function setTheme(t: Theme) {
    setStoredTheme(t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
