import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { formatNumber, formatPercent } from '@/utils/format'
import type { Tone } from '@/utils/status'

const TONE_FILL: Record<Tone, string> = {
  neutral: 'bg-fg-3/60',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export interface DistributionItem {
  key: string
  label: string
  value: number
  tone: Tone
  description?: string
}

/**
 * Part-to-whole as a single segmented bar plus a labelled list (status states
 * use the reserved status tones and always carry a text label).
 */
export function StatusDistribution({ items, total, unit = 'bookings' }: { items: DistributionItem[]; total: number; unit?: string }) {
  if (total === 0) {
    return <p className="py-6 text-center text-[13px] text-fg-3">No {unit} in this period.</p>
  }
  return (
    <div>
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-muted" role="img" aria-label={`Distribution of ${formatNumber(total)} ${unit}`}>
        {items
          .filter((item) => item.value > 0)
          .map((item, index) => (
            <motion.div
              key={item.key}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', TONE_FILL[item.tone])}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / total) * 100}%` }}
              transition={{ duration: 0.6, delay: index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
              title={`${item.label}: ${formatNumber(item.value)}`}
            />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2 text-[13px]" title={item.description}>
            <span className="flex min-w-0 items-center gap-2 text-fg-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', TONE_FILL[item.tone])} aria-hidden />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tabular">
              <span className="font-medium text-fg">{formatNumber(item.value)}</span>
              <span className="ml-1.5 text-xs text-fg-3">{formatPercent(item.value / total, 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface RankedItem {
  key: string
  label: ReactNode
  sublabel?: ReactNode
  value: number
  display: string
  leading?: ReactNode
  href?: string
}

/** Ranked horizontal bars (one series, one colour) with the value as text. */
export function RankedBars({ items, max, empty }: { items: RankedItem[]; max?: number; empty?: ReactNode }) {
  if (items.length === 0) return <>{empty}</>
  const top = max ?? Math.max(...items.map((item) => item.value), 1)
  return (
    <ol className="flex flex-col gap-3.5">
      {items.map((item, index) => (
        <li key={item.key} className="flex items-center gap-3">
          {item.leading}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] font-medium text-fg">{item.label}</span>
              <span className="shrink-0 text-[13px] font-medium text-fg tabular">{item.display}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--c-chart-1)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${top > 0 ? Math.max(2, (item.value / top) * 100) : 0}%` }}
                  transition={{ duration: 0.7, delay: index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                />
              </div>
              {item.sublabel && <span className="shrink-0 text-[11px] text-fg-3 tabular">{item.sublabel}</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
