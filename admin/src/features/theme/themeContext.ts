import { createContext, useContext } from 'react'
import type { Theme } from './theme'

export type ThemePreference = Theme | 'system'

interface ThemeContextValue {
  /** The theme currently applied. */
  theme: Theme
  /** What the admin chose; "system" follows the OS setting. */
  preference: ThemePreference
  setTheme: (theme: Theme) => void
  followSystem: () => void
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
