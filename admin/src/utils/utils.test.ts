import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { addDays, daysBetween, defaultInterval, isDateString, periodLabel, presetRange } from './dates'
import { formatDate, formatMoney, formatPercent, humanize } from './format'

describe('format', () => {
  it('formats whole KRW without decimals', () => {
    expect(formatMoney(1234500)).toBe('₩1,234,500')
    expect(formatMoney(0)).toBe('₩0')
  })

  it('shows booking calendar days without timezone shift', () => {
    // A UTC-midnight booking date must stay on its calendar day in any timezone.
    expect(formatDate('2026-06-10T00:00:00.000Z')).toBe('10 Jun 2026')
    expect(formatDate('2026-06-10')).toBe('10 Jun 2026')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats percentages and enum labels', () => {
    expect(formatPercent(0.1234)).toBe('12.3%')
    expect(humanize('PARTIALLY_REFUNDED')).toBe('Partially refunded')
  })
})

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isDateString('2026-02-28')).toBe(true)
    expect(isDateString('2026-02-30')).toBe(false)
    expect(isDateString('2026-2-3')).toBe(false)
  })

  it('computes inclusive ranges and presets', () => {
    expect(daysBetween('2026-06-01', '2026-06-30')).toBe(30)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(presetRange('30d', '2026-11-20')).toEqual({ from: '2026-10-22', to: '2026-11-20' })
    expect(presetRange('ytd', '2026-11-20')).toEqual({ from: '2026-01-01', to: '2026-11-20' })
    expect(presetRange('12m', '2026-11-20')).toEqual({ from: '2025-12-01', to: '2026-11-20' })
  })

  it('picks a chart interval that keeps point counts readable', () => {
    expect(defaultInterval('2026-11-01', '2026-11-20')).toBe('day')
    expect(defaultInterval('2026-08-01', '2026-11-20')).toBe('week')
    expect(defaultInterval('2025-12-01', '2026-11-20')).toBe('month')
    expect(defaultInterval('2020-01-01', '2026-11-20')).toBe('year')
    expect(periodLabel('2026-03-01', 'month', true)).toBe('Mar 2026')
    expect(periodLabel('2026-01-01', 'year')).toBe('2026')
  })
})

describe('csv', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], [1, null]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n1,')
  })

  it('neutralises spreadsheet formulas in text but keeps negative numbers', () => {
    expect(toCsv(['name'], [['=HYPERLINK("x")'], [-5]])).toBe("name\r\n\"'=HYPERLINK(\"\"x\"\")\"\r\n-5")
  })
})
