const DAY_MS = 24 * 60 * 60 * 1000

/** Returns a local calendar date as `YYYY-MM-DD` (the format used by <input type="date">). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function parseISODate(iso: string): Date {
  const [y = 0, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(parseISODate(iso).getTime())
}

/** Whole nights between two ISO dates (0 when the range is empty or inverted). */
export function nightsBetween(startISO: string, endISO: string): number {
  if (!isValidISODate(startISO) || !isValidISODate(endISO)) return 0
  const diff = Math.round((parseISODate(endISO).getTime() - parseISODate(startISO).getTime()) / DAY_MS)
  return Math.max(0, diff)
}
