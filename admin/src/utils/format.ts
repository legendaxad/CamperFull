/*
 * Formatting helpers. Money from the API is a whole number of KRW.
 * Booking dates are calendar days stored as UTC midnight, so they are formatted
 * in UTC; timestamps (createdAt, paidAt) are shown in the business timezone.
 */
export const BUSINESS_TIMEZONE = 'Asia/Seoul'
export const DEFAULT_CURRENCY = 'KRW'

const currencyFormatters = new Map<string, Intl.NumberFormat>()
const compactCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KRW', notation: 'compact', maximumFractionDigits: 1 })
const numberFormatter = new Intl.NumberFormat('en-US')
const compactNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** 1234500 -> "₩1,234,500" */
export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(Math.round(amount))
}

/** 1234500 -> "₩1.2M" (chart axes, tight spaces). */
export function formatMoneyCompact(amount: number): string {
  return compactCurrency.format(amount)
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatNumberCompact(value: number): string {
  return compactNumber.format(value)
}

/** 0.1234 -> "12.3%" */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/
const dayFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const shortDayFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BUSINESS_TIMEZONE,
})
const timestampDateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: BUSINESS_TIMEZONE })

function parse(iso: string): Date | null {
  const date = new Date(CALENDAR_DAY.test(iso) ? `${iso.slice(0, 10)}T00:00:00Z` : iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Calendar day (booking date or "YYYY-MM-DD") -> "10 Jun 2026". Timestamps -> date in Korea. */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const date = parse(iso)
  if (!date) return '—'
  return CALENDAR_DAY.test(iso) ? dayFormatter.format(date) : timestampDateFormatter.format(date)
}

export function formatShortDay(iso: string): string {
  const date = parse(iso)
  return date ? shortDayFormatter.format(date) : '—'
}

/** Timestamp -> "10 Jun 2026, 14:05" (Korean time). */
export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const date = parse(iso)
  return date ? timestampFormatter.format(date) : '—'
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "3 minutes ago", "yesterday" ... */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const date = parse(iso)
  if (!date) return '—'
  const seconds = Math.round((date.getTime() - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return 'just now'
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')
  if (abs < 86_400 * 30) return relative.format(Math.round(seconds / 86_400), 'day')
  return formatDate(iso)
}

export function fullName(person: { firstName?: string; lastName?: string } | null | undefined): string {
  if (!person) return 'Unknown'
  return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown'
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

/** Enum value -> label: "PARTIALLY_REFUNDED" -> "Partially refunded". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}
