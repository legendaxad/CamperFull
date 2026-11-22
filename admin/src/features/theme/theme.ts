export type Theme = 'light' | 'dark'

/** Same key as the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'fc-admin-theme'

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function currentDocumentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Applies a theme to <html>. Colours cross-fade briefly unless the user prefers reduced motion. */
export function applyTheme(theme: Theme, animate: boolean): void {
  const root = document.documentElement
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (animate && !reduce) {
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 260)
  }
  root.dataset.theme = theme
  root.style.colorScheme = theme
}
