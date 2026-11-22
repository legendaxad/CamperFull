import type { Interval } from '@/types/api'
import { BUSINESS_TIMEZONE } from './format'

/*
 * Calendar-day helpers. Dates are "YYYY-MM-DD" strings in the business
 * timezone (Korea), matching the backend's date convention.
 */
const DAY_MS = 86_400_000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function todayInKorea(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}

/** Inclusive number of days from `from` to `to`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`
}

export function addMonths(day: string, months: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)).toISOString().slice(0, 10)
}

export function endOfMonth(day: string): string {
  return addDays(addMonths(day, 1), -1)
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayMondayFirst(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7
}

export const RANGE_PRESETS = [
  { id: '7d', label: '7D', title: 'Last 7 days' },
  { id: '30d', label: '30D', title: 'Last 30 days' },
  { id: '90d', label: '90D', title: 'Last 90 days' },
  { id: '12m', label: '12M', title: 'Last 12 months' },
  { id: 'ytd', label: 'YTD', title: 'Year to date' },
] as const

export type RangePresetId = (typeof RANGE_PRESETS)[number]['id']

export function presetRange(id: RangePresetId, today: string = todayInKorea()): { from: string; to: string } {
  switch (id) {
    case '7d':
      return { from: addDays(today, -6), to: today }
    case '30d':
      return { from: addDays(today, -29), to: today }
    case '90d':
      return { from: addDays(today, -89), to: today }
    case '12m':
      return { from: addMonths(startOfMonth(today), -11), to: today }
    case 'ytd':
      return { from: `${today.slice(0, 4)}-01-01`, to: today }
  }
}

/** A bucket size that gives charts roughly 7-60 points. */
export function defaultInterval(from: string, to: string): Interval {
  const days = daysBetween(from, to)
  if (days <= 45) return 'day'
  if (days <= 180) return 'week'
  if (days <= 1100) return 'month'
  return 'year'
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortMonthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const dayMonthFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Axis/tooltip label for a series period ("YYYY-MM-DD" = first day of the bucket). */
export function periodLabel(period: string, interval: Interval, long = false): string {
  const date = new Date(`${period}T00:00:00Z`)
  if (interval === 'year') return period.slice(0, 4)
  if (interval === 'month') return long ? monthFormatter.format(date) : shortMonthFormatter.format(date)
  if (interval === 'week') return long ? `Week of ${dayMonthFormatter.format(date)}` : dayMonthFormatter.format(date)
  return dayMonthFormatter.format(date)
}
