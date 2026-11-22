import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import type { DateRangeState } from '@/hooks/useDateRange'
import { cn } from '@/utils/cn'
import { daysBetween, RANGE_PRESETS, todayInKorea } from '@/utils/dates'
import { formatDate } from '@/utils/format'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Field'
import { Popover } from '../ui/Menu'
import { Segmented } from '../ui/Segmented'

const MAX_DAYS = 3660

/** Preset pills plus a custom range popover. The range lives in the URL (see useDateRange). */
export function DateRangeControl({ range, className }: { range: DateRangeState; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Segmented
        label="Date range"
        options={RANGE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label, title: preset.title }))}
        value={range.preset === 'custom' ? null : range.preset}
        onChange={range.setPreset}
      />
      <Popover
        kind="dialog"
        className="w-[min(92vw,320px)] p-4"
        trigger={({ toggle, ...aria }) => (
          <button
            type="button"
            onClick={toggle}
            {...aria}
            className={cn(
              'flex h-8 items-center gap-2 rounded-[10px] border px-3 text-xs font-medium transition-colors',
              range.preset === 'custom' ? 'border-accent/40 bg-accent-soft text-accent-ink' : 'border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular">
              {formatDate(range.from)} – {formatDate(range.to)}
            </span>
          </button>
        )}
      >
        {(close) => <CustomRangeForm range={range} onDone={close} />}
      </Popover>
    </div>
  )
}

function CustomRangeForm({ range, onDone }: { range: DateRangeState; onDone: () => void }) {
  const [from, setFrom] = useState(range.from)
  const [to, setTo] = useState(range.to)
  const today = todayInKorea()
  const error = !from || !to ? 'Choose both dates.' : from > to ? 'The start date must be before the end date.' : daysBetween(from, to) > MAX_DAYS ? 'Choose a range of 10 years or less.' : undefined

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (error) return
        range.setCustom(from, to)
        onDone()
      }}
      className="flex flex-col gap-3"
    >
      <p className="text-[13px] font-semibold text-fg">Custom range</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From">{(id) => <Input id={id} type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label="To">{(id) => <Input id={id} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}</Field>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <p className="text-[11px] text-fg-3">Dates are Korean calendar days; both ends are included.</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" type="submit" disabled={Boolean(error)}>
          Apply
        </Button>
      </div>
    </form>
  )
}
