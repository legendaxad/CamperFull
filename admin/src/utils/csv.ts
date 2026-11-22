export type CsvCell = string | number | null | undefined

/** Builds an RFC 4180 CSV string. Text cells that look like formulas are neutralised. */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const escape = (value: CsvCell) => {
    if (value === null || value === undefined) return ''
    let text = String(value)
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

/** Downloads a CSV with a BOM so Excel opens UTF-8 (Korean) text correctly. */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]): void {
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
