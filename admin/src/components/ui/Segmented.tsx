import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/utils/cn'

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string; title?: string }[]
  value: T | null
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Pill selector with a sliding indicator (date presets, intervals, tabs). */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'sm', className }: SegmentedProps<T>) {
  const layoutId = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex items-center rounded-[10px] border border-line bg-muted p-0.5', className)}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-[8px] font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              active ? 'text-fg' : 'text-fg-3 hover:text-fg-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-[8px] bg-surface shadow-sm ring-1 ring-line"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

interface TabsProps<T extends string> {
  tabs: readonly { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** Underlined tabs for switching sections inside a page. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: TabsProps<T>) {
  const layoutId = useId()
  return (
    <div role="tablist" aria-label={label} className="scrollbar-thin -mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn('relative flex h-10 items-center gap-2 px-3 text-[13px] font-medium whitespace-nowrap transition-colors', active ? 'text-fg' : 'text-fg-3 hover:text-fg-2')}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px] tabular', active ? 'bg-accent-soft text-accent-ink' : 'bg-muted text-fg-3')}>{tab.count}</span>
            )}
            {active && <motion.span layoutId={layoutId} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}
