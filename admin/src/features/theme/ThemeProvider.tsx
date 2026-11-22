import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyTheme, currentDocumentTheme, readStoredTheme, systemTheme, THEME_STORAGE_KEY, type Theme } from './theme'
import { ThemeContext, type ThemePreference } from './themeContext'

/**
 * Theme state. The initial theme was already applied by the inline script in
 * index.html (saved preference, else system preference), so React only reads it.
 * Until the admin picks a theme explicitly, the dashboard follows OS changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(currentDocumentTheme)
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredTheme() ?? 'system')

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    setPreference(next)
    applyTheme(next, true)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable: the choice lasts for this session only */
    }
  }, [])

  const followSystem = useCallback(() => {
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    const next = systemTheme()
    setPreference('system')
    setThemeState(next)
    applyTheme(next, true)
  }, [])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => {
      if (readStoredTheme()) return
      const next: Theme = event.matches ? 'dark' : 'light'
      setThemeState(next)
      applyTheme(next, true)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const value = useMemo(
    () => ({ theme, preference, setTheme, followSystem, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, preference, setTheme, followSystem],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
