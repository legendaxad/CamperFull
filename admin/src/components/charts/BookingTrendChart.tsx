import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { BookingPoint, Interval } from '@/types/api'
import { periodLabel } from '@/utils/dates'
import { formatMoney, formatNumber } from '@/utils/format'
import { AXIS_TICK_STYLE, useChartTheme } from './chartTheme'
import { ChartTooltipCard, LegendItem } from './ChartTooltip'

interface Row {
  period: string
  confirmed: number
  open: number
  cancelled: number
  bookings: number
  value: number
}

/**
 * Bookings created per period, stacked by how they ended up:
 * confirmed (confirmed/active/completed), still pending, cancelled or rejected.
 */
export function BookingTrendChart({ data, interval, height = 280 }: { data: BookingPoint[]; interval: Interval; height?: number }) {
  const theme = useChartTheme()
  const [, blue, aqua, violet] = theme.series
  const rows: Row[] = data.map((point) => ({
    period: point.period,
    confirmed: point.confirmed,
    cancelled: point.cancelled,
    open: Math.max(0, point.bookings - point.confirmed - point.cancelled),
    bookings: point.bookings,
    value: point.value,
  }))
  const radius: [number, number, number, number] = [4, 4, 0, 0]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 px-1">
        <LegendItem color={blue} label="Confirmed" />
        <LegendItem color={aqua} label="Pending" />
        <LegendItem color={violet} label="Cancelled / rejected" />
      </div>
      <div style={{ height }} role="img" aria-label="Bookings created over time chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="period"
              tickFormatter={(value: string) => periodLabel(value, interval)}
              tick={{ ...AXIS_TICK_STYLE, fill: theme.axis }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
              tickMargin={8}
            />
            <YAxis allowDecimals={false} tick={{ ...AXIS_TICK_STYLE, fill: theme.axis }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.6 }}
              content={(props: TooltipContentProps) => {
                const row = props.active ? (props.payload?.[0]?.payload as Row | undefined) : undefined
                if (!row) return null
                return (
                  <ChartTooltipCard
                    title={periodLabel(row.period, interval, true)}
                    rows={[
                      { label: 'Confirmed', value: formatNumber(row.confirmed), color: blue },
                      { label: 'Pending', value: formatNumber(row.open), color: aqua },
                      { label: 'Cancelled / rejected', value: formatNumber(row.cancelled), color: violet },
                    ]}
                    footer={
                      <span className="flex justify-between gap-4">
                        <span>{formatNumber(row.bookings)} created</span>
                        <span className="tabular">{formatMoney(row.value)} booked</span>
                      </span>
                    }
                  />
                )
              }}
            />
            {/* 2px surface gap between stacked segments */}
            <Bar dataKey="confirmed" stackId="b" fill={blue} stroke={theme.surface} strokeWidth={1} isAnimationActive={theme.animate} />
            <Bar dataKey="open" stackId="b" fill={aqua} stroke={theme.surface} strokeWidth={1} isAnimationActive={theme.animate} />
            <Bar dataKey="cancelled" stackId="b" fill={violet} stroke={theme.surface} strokeWidth={1} radius={radius} isAnimationActive={theme.animate} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
