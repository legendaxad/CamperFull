import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { CustomerAnalytics, Interval } from '@/types/api'
import { periodLabel } from '@/utils/dates'
import { formatNumber } from '@/utils/format'
import { AXIS_TICK_STYLE, useChartTheme } from './chartTheme'
import { ChartTooltipCard } from './ChartTooltip'

type Point = CustomerAnalytics['series'][number]

/** New customer registrations per period; the tooltip carries the running total (no second axis). */
export function CustomerGrowthChart({ data, interval, height = 240 }: { data: Point[]; interval: Interval; height?: number }) {
  const theme = useChartTheme()
  const color = theme.series[2]
  return (
    <div style={{ height }} role="img" aria-label="New customer registrations chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
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
              const row = props.active ? (props.payload?.[0]?.payload as Point | undefined) : undefined
              if (!row) return null
              return (
                <ChartTooltipCard
                  title={periodLabel(row.period, interval, true)}
                  rows={[
                    { label: 'New customers', value: formatNumber(row.registrations), color },
                    { label: 'Total registered', value: formatNumber(row.totalCustomers), muted: true },
                  ]}
                />
              )
            }}
          />
          <Bar dataKey="registrations" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={theme.animate} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
