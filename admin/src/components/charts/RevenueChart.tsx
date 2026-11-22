import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { Interval, RevenuePoint } from '@/types/api'
import { periodLabel } from '@/utils/dates'
import { formatMoney, formatMoneyCompact, formatNumber } from '@/utils/format'
import { AXIS_TICK_STYLE, useChartTheme } from './chartTheme'
import { ChartTooltipCard, LegendItem } from './ChartTooltip'

interface RevenueChartProps {
  data: RevenuePoint[]
  interval: Interval
  /** Same-length previous period, aligned by position, for comparison. */
  previous?: RevenuePoint[]
  height?: number
}

interface Row {
  period: string
  revenue: number
  refunded: number
  payments: number
  previous?: number
  previousPeriod?: string
}

/** Net captured revenue per period (refunds already deducted), optionally against the previous period. */
export function RevenueChart({ data, interval, previous, height = 280 }: RevenueChartProps) {
  const theme = useChartTheme()
  const gradientId = useId()
  const rows: Row[] = data.map((point, index) => ({
    ...point,
    previous: previous?.[index]?.revenue,
    previousPeriod: previous?.[index]?.period,
  }))
  const comparison = Boolean(previous?.length)
  const [gold] = theme.series

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 px-1">
        <LegendItem color={gold} label="Net revenue" />
        {comparison && <LegendItem color={theme.axis} label="Previous period" line />}
      </div>
      <div style={{ height }} role="img" aria-label="Revenue over time chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gold} stopOpacity={0.28} />
                <stop offset="100%" stopColor={gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey="period"
              tickFormatter={(value: string) => periodLabel(value, interval)}
              tick={{ ...AXIS_TICK_STYLE, fill: theme.axis }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              tickMargin={8}
            />
            <YAxis tickFormatter={(value: number) => formatMoneyCompact(value)} tick={{ ...AXIS_TICK_STYLE, fill: theme.axis }} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeWidth: 1 }}
              content={(props: TooltipContentProps) => {
                const row = props.active ? (props.payload?.[0]?.payload as Row | undefined) : undefined
                if (!row) return null
                return (
                  <ChartTooltipCard
                    title={periodLabel(row.period, interval, true)}
                    rows={[
                      { label: 'Net revenue', value: formatMoney(row.revenue), color: gold },
                      { label: 'Refunded', value: formatMoney(row.refunded), muted: true },
                      { label: 'Payments', value: formatNumber(row.payments), muted: true },
                      ...(comparison && row.previous !== undefined
                        ? [{ label: `Prev. (${periodLabel(row.previousPeriod ?? '', interval)})`, value: formatMoney(row.previous), color: theme.axis }]
                        : []),
                    ]}
                  />
                )
              }}
            />
            {comparison && (
              <Line type="monotone" dataKey="previous" stroke={theme.axis} strokeWidth={1.5} strokeOpacity={0.7} dot={false} activeDot={false} isAnimationActive={theme.animate} />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={gold}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 4, stroke: theme.surface, strokeWidth: 2 }}
              isAnimationActive={theme.animate}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
