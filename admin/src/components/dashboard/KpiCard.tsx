import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCountUp } from '@/hooks/common'
import { cn } from '@/utils/cn'
import { formatPercent } from '@/utils/format'
import { Skeleton } from '../ui/Feedback'

export type KpiFormat = (value: number) => string

interface Comparison {
  previous: number | null
  /** "ratio" metrics (rates) are compared in percentage points, the rest in % change. */
  kind: 'change' | 'points'
  /** True when a decrease is the good outcome (e.g. cancellation rate). */
  invert?: boolean
  label: string
}

interface KpiCardProps {
  title: string
  icon: LucideIcon
  value: number | null
  format: KpiFormat
  comparison?: Comparison
  /** Shown under the value when there is no comparison (snapshot metrics). */
  hint?: ReactNode
  /** Explains what is unavailable when value is null. */
  unavailable?: string
  href?: string
  loading?: boolean
  index?: number
}

function Delta({ current, comparison }: { current: number; comparison: Comparison }) {
  const { previous, kind, invert, label } = comparison
  if (previous === null) return <span className="text-xs text-fg-3">No data for {label}</span>

  let text: string
  let direction: 'up' | 'down' | 'flat'
  if (kind === 'points') {
    const diff = (current - previous) * 100
    direction = Math.abs(diff) < 0.05 ? 'flat' : diff > 0 ? 'up' : 'down'
    text = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pts`
  } else if (previous === 0) {
    if (current === 0) return <span className="text-xs text-fg-3">No change vs {label}</span>
    return <span className="text-xs text-fg-3">None in {label}</span>
  } else {
    const change = (current - previous) / Math.abs(previous)
    direction = Math.abs(change) < 0.0005 ? 'flat' : change > 0 ? 'up' : 'down'
    text = `${change > 0 ? '+' : ''}${formatPercent(change)}`
  }

  const good = direction === 'flat' ? null : (direction === 'up') !== Boolean(invert)
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular',
          good === null ? 'bg-neutral-soft text-fg-2' : good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {text}
      </span>
      <span className="text-fg-3">vs {label}</span>
    </span>
  )
}

function AnimatedValue({ value, format }: { value: number; format: KpiFormat }) {
  const animated = useCountUp(value)
  return (
    <>
      <span aria-hidden>{format(animated)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  )
}

export function KpiCard({ title, icon: Icon, value, format, comparison, hint, unavailable, href, loading, index = 0 }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-fg-2">{title}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-4 w-36" />
        </>
      ) : value === null ? (
        <>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-fg-3">—</p>
          <p className="mt-2 text-xs text-fg-3">{unavailable ?? 'Not enough data for this period'}</p>
        </>
      ) : (
        <>
          <p className="mt-2 text-[26px] leading-tight font-semibold tracking-tight text-fg tabular">
            <AnimatedValue value={value} format={format} />
          </p>
          <div className="mt-2 min-h-5">{comparison ? <Delta current={value} comparison={comparison} /> : hint && <span className="text-xs text-fg-3">{hint}</span>}</div>
        </>
      )}
    </>
  )

  const className = 'card group block p-5 transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}>
      {href ? (
        <Link to={href} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </motion.div>
  )
}
