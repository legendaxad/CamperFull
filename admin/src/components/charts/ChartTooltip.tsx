import type { ReactNode } from 'react'

export interface TooltipRow {
  label: string
  value: string
  color?: string
  muted?: boolean
}

/** Tooltip card shared by every chart: title, then colour-keyed rows (text stays in text colours). */
export function ChartTooltipCard({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-fg">{title}</p>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-fg-3">
              {row.color && <span className="h-2 w-2 rounded-[3px]" style={{ background: row.color }} aria-hidden />}
              {row.label}
            </span>
            <span className={row.muted ? 'text-fg-3 tabular' : 'font-medium text-fg tabular'}>{row.value}</span>
          </div>
        ))}
      </div>
      {footer && <div className="mt-2 border-t border-line pt-1.5 text-fg-3">{footer}</div>}
    </div>
  )
}

export function LegendItem({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-fg-3">
      <span className={line ? 'h-0.5 w-3.5 rounded-full' : 'h-2.5 w-2.5 rounded-[3px]'} style={{ background: color }} aria-hidden />
      {label}
    </span>
  )
}
