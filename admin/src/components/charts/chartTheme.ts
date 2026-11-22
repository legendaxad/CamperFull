import { useMemo } from 'react'
import { useTheme } from '@/features/theme/themeContext'
import { usePrefersReducedMotion } from '@/hooks/common'

export interface ChartTheme {
  series: [string, string, string, string, string]
  grid: string
  axis: string
  text: string
  muted: string
  surface: string
  animate: boolean
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/**
 * Chart colours come from the same CSS tokens as the rest of the UI (validated
 * categorical palette, one step per theme), re-read whenever the theme changes.
 */
export function useChartTheme(): ChartTheme {
  const { theme } = useTheme()
  const reduced = usePrefersReducedMotion()
  return useMemo(
    () => ({
      series: [cssVar('--c-chart-1'), cssVar('--c-chart-2'), cssVar('--c-chart-3'), cssVar('--c-chart-4'), cssVar('--c-chart-5')],
      grid: cssVar('--c-chart-grid'),
      axis: cssVar('--c-chart-axis'),
      text: cssVar('--c-fg'),
      muted: cssVar('--c-fg-3'),
      surface: cssVar('--c-surface'),
      animate: !reduced,
    }),
    // theme is the trigger for re-reading the variables
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, reduced],
  )
}

export const AXIS_TICK_STYLE = { fontSize: 11 }
