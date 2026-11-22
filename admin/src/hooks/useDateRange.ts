import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Interval } from '@/types/api'
import { daysBetween, defaultInterval, isDateString, presetRange, RANGE_PRESETS, type RangePresetId } from '@/utils/dates'

const MAX_DAYS = 3660
const INTERVALS: Interval[] = ['day', 'week', 'month', 'year']

export interface DateRangeState {
  from: string
  to: string
  preset: RangePresetId | 'custom'
  interval: Interval
  days: number
  setPreset: (preset: RangePresetId) => void
  setCustom: (from: string, to: string) => void
  setInterval: (interval: Interval) => void
}

/**
 * Date range kept in the URL (`?range=30d` or `?from=…&to=…`), so a filtered
 * view survives refreshes and can be shared. Invalid values fall back to the default.
 */
export function useDateRange(defaultPreset: RangePresetId = '30d'): DateRangeState {
  const [params, setParams] = useSearchParams()
  const rangeParam = params.get('range')
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const intervalParam = params.get('interval')

  const resolved = useMemo(() => {
    if (isDateString(fromParam) && isDateString(toParam) && fromParam <= toParam && daysBetween(fromParam, toParam) <= MAX_DAYS) {
      return { from: fromParam, to: toParam, preset: 'custom' as const }
    }
    const preset = RANGE_PRESETS.some((p) => p.id === rangeParam) ? (rangeParam as RangePresetId) : defaultPreset
    return { ...presetRange(preset), preset }
  }, [fromParam, toParam, rangeParam, defaultPreset])

  const interval = INTERVALS.includes(intervalParam as Interval) ? (intervalParam as Interval) : defaultInterval(resolved.from, resolved.to)

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          mutate(next)
          next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  return {
    ...resolved,
    interval,
    days: daysBetween(resolved.from, resolved.to),
    setPreset: (preset) =>
      update((next) => {
        next.set('range', preset)
        next.delete('from')
        next.delete('to')
        next.delete('interval')
      }),
    setCustom: (from, to) =>
      update((next) => {
        next.delete('range')
        next.set('from', from)
        next.set('to', to)
        next.delete('interval')
      }),
    setInterval: (value) => update((next) => next.set('interval', value)),
  }
}
