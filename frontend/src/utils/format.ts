const numberFormatter = new Intl.NumberFormat('en-US')
const currencyFormatters = new Map<string, Intl.NumberFormat>()

/** The backend stores whole amounts in the business currency (KRW unless settings say otherwise). */
export const DEFAULT_CURRENCY = 'KRW'

/** Formats money from the API, e.g. 180000 -> "₩180,000". */
export function formatPrice(amount: number, currency: string = DEFAULT_CURRENCY): string {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(Math.round(amount))
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

/**
 * Formats a date for display. Booking dates are calendar days stored as UTC midnight
 * ("2026-06-10T00:00:00.000Z"), so plain `YYYY-MM-DD` values and those timestamps are
 * shown in UTC to avoid shifting the day in timezones west of UTC.
 */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/

export function formatDate(iso: string): string {
  const isCalendarDay = CALENDAR_DAY.test(iso)
  const date = new Date(isCalendarDay ? `${iso.slice(0, 10)}T00:00:00Z` : iso)
  if (Number.isNaN(date.getTime())) return '—'
  return isCalendarDay ? utcDateFormatter.format(date) : dateFormatter.format(date)
}

/** "2026-06-10T00:00:00.000Z" -> "2026-06-10" (booking calendar day). */
export function toCalendarDay(iso: string): string {
  return iso.slice(0, 10)
}

const utcDateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
