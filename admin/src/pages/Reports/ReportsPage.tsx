import { Download } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DateRangeControl } from '@/components/dashboard/DateRangeControl'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Segmented, Tabs } from '@/components/ui/Segmented'
import { useToast } from '@/components/ui/toastContext'
import { useDateRange } from '@/hooks/useDateRange'
import { useBookingSeriesQuery, useCustomerAnalyticsQuery, useFleetQuery, useKpisQuery, useRevenueSeriesQuery } from '@/services/endpoints'
import type { Interval } from '@/types/api'
import { downloadCsv, type CsvCell } from '@/utils/csv'
import { periodLabel } from '@/utils/dates'
import { formatMoney, formatNumber, formatPercent, fullName } from '@/utils/format'
import { CAMPER_STATUS_META } from '@/utils/status'

type ReportId = 'revenue' | 'bookings' | 'fleet' | 'customers' | 'cancellations'

const REPORTS: { value: ReportId; label: string }[] = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'bookings', label: 'Booking performance' },
  { value: 'fleet', label: 'Campers & occupancy' },
  { value: 'customers', label: 'Customer growth' },
  { value: 'cancellations', label: 'Cancellations' },
]

const INTERVALS: { value: Interval; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

interface ReportTable {
  headers: string[]
  /** Display cells (formatted). */
  rows: ReactNode[][]
  /** Raw values for CSV (numbers stay numbers). */
  csv: CsvCell[][]
  alignRight?: number[]
  totals?: ReactNode[]
}

function Summary({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 border-b border-line px-5 py-4 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs text-fg-3">{item.label}</p>
          <p className="mt-1 text-lg font-semibold text-fg tabular">{item.value}</p>
          {item.sub && <p className="text-xs text-fg-3">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function Table({ table }: { table: ReportTable }) {
  if (table.rows.length === 0) return <EmptyState compact title="No data in this period" />
  const right = new Set(table.alignRight ?? [])
  return (
    <div className="scrollbar-thin max-h-[560px] overflow-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="sticky top-0 z-[1]">
          <tr className="border-b border-line bg-subtle text-xs text-fg-3">
            {table.headers.map((header, index) => (
              <th key={header} scope="col" className={`h-10 px-4 font-medium first:pl-5 last:pr-5 ${right.has(index) ? 'text-right' : 'text-left'}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-line last:border-0">
              {row.map((cell, index) => (
                <td key={index} className={`h-11 px-4 first:pl-5 last:pr-5 ${right.has(index) ? 'text-right tabular' : 'text-fg-2'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {table.totals && (
          <tfoot>
            <tr className="border-t border-line-strong bg-subtle font-semibold text-fg">
              {table.totals.map((cell, index) => (
                <td key={index} className={`h-11 px-4 first:pl-5 last:pr-5 ${right.has(index) ? 'text-right tabular' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const range = useDateRange('12m')
  const toast = useToast()
  const [report, setReport] = useState<ReportId>('revenue')
  const args = { from: range.from, to: range.to, interval: range.interval }

  const revenue = useRevenueSeriesQuery(args, { skip: report !== 'revenue' })
  const bookings = useBookingSeriesQuery(args, { skip: report !== 'bookings' && report !== 'cancellations' })
  const kpis = useKpisQuery(args)
  const fleet = useFleetQuery(args, { skip: report !== 'fleet' })
  const customers = useCustomerAnalyticsQuery({ ...args, limit: 20 }, { skip: report !== 'customers' })

  const label = (period: string) => periodLabel(period, range.interval, true)
  const current = kpis.data?.current

  let summary: { label: string; value: string; sub?: string }[] = []
  let table: ReportTable | null = null
  let state: { loading: boolean; error: unknown; refetch: () => void } = { loading: false, error: null, refetch: () => {} }

  if (report === 'revenue') {
    state = { loading: revenue.isLoading, error: revenue.error, refetch: revenue.refetch }
    const rows = revenue.data ?? []
    const total = rows.reduce((sum, row) => sum + row.revenue, 0)
    const refunded = rows.reduce((sum, row) => sum + row.refunded, 0)
    const payments = rows.reduce((sum, row) => sum + row.payments, 0)
    const best = rows.reduce<(typeof rows)[number] | null>((top, row) => (!top || row.revenue > top.revenue ? row : top), null)
    summary = [
      { label: 'Net revenue', value: formatMoney(total) },
      { label: 'Refunded (of these payments)', value: formatMoney(refunded) },
      { label: 'Captured payments', value: formatNumber(payments) },
      { label: 'Best period', value: best && best.revenue > 0 ? label(best.period) : '—', sub: best && best.revenue > 0 ? formatMoney(best.revenue) : undefined },
    ]
    table = {
      headers: ['Period', 'Net revenue (KRW)', 'Refunded (KRW)', 'Payments'],
      alignRight: [1, 2, 3],
      rows: rows.map((row) => [label(row.period), formatMoney(row.revenue), formatMoney(row.refunded), formatNumber(row.payments)]),
      csv: rows.map((row) => [row.period, row.revenue, row.refunded, row.payments]),
      totals: ['Total', formatMoney(total), formatMoney(refunded), formatNumber(payments)],
    }
  } else if (report === 'bookings' || report === 'cancellations') {
    state = { loading: bookings.isLoading, error: bookings.error, refetch: bookings.refetch }
    const rows = bookings.data ?? []
    const created = rows.reduce((sum, row) => sum + row.bookings, 0)
    const confirmed = rows.reduce((sum, row) => sum + row.confirmed, 0)
    const cancelled = rows.reduce((sum, row) => sum + row.cancelled, 0)
    const value = rows.reduce((sum, row) => sum + row.value, 0)
    if (report === 'bookings') {
      summary = [
        { label: 'Bookings created', value: formatNumber(created) },
        { label: 'Confirmed', value: formatNumber(confirmed), sub: created ? `${formatPercent(confirmed / created)} of created` : undefined },
        { label: 'Booking value (confirmed)', value: formatMoney(value), sub: 'Not revenue until paid' },
        { label: 'Avg. booking value', value: current?.averageBookingValue ? formatMoney(current.averageBookingValue) : '—' },
      ]
      table = {
        headers: ['Period', 'Created', 'Confirmed', 'Cancelled / rejected', 'Confirmed value (KRW)'],
        alignRight: [1, 2, 3, 4],
        rows: rows.map((row) => [label(row.period), formatNumber(row.bookings), formatNumber(row.confirmed), formatNumber(row.cancelled), formatMoney(row.value)]),
        csv: rows.map((row) => [row.period, row.bookings, row.confirmed, row.cancelled, row.value]),
        totals: ['Total', formatNumber(created), formatNumber(confirmed), formatNumber(cancelled), formatMoney(value)],
      }
    } else {
      summary = [
        { label: 'Cancellation rate', value: current?.cancellationRate == null ? '—' : formatPercent(current.cancellationRate), sub: 'Cancelled after confirmation ÷ confirmed' },
        { label: 'Cancelled after confirming', value: formatNumber(current?.cancelledAfterConfirmation ?? 0) },
        { label: 'Expired unpaid holds', value: formatNumber(current?.expiredUnpaid ?? 0), sub: 'Checkout not completed in time' },
        { label: 'Rejected by admins', value: formatNumber(current?.rejected ?? 0) },
      ]
      table = {
        headers: ['Period', 'Created', 'Cancelled / rejected', 'Share of created'],
        alignRight: [1, 2, 3],
        rows: rows.map((row) => [label(row.period), formatNumber(row.bookings), formatNumber(row.cancelled), row.bookings ? formatPercent(row.cancelled / row.bookings) : '—']),
        csv: rows.map((row) => [row.period, row.bookings, row.cancelled, row.bookings ? Number((row.cancelled / row.bookings).toFixed(4)) : '']),
        totals: ['Total', formatNumber(created), formatNumber(cancelled), created ? formatPercent(cancelled / created) : '—'],
      }
    }
  } else if (report === 'fleet') {
    state = { loading: fleet.isLoading, error: fleet.error, refetch: fleet.refetch }
    const rows = fleet.data?.campers ?? []
    summary = [
      { label: 'Occupancy rate', value: current?.occupancyRate == null ? '—' : formatPercent(current.occupancyRate), sub: current ? `${formatNumber(current.bookedNights)} booked camper-nights` : undefined },
      { label: 'Fleet size', value: formatNumber(current?.fleetSize ?? 0), sub: 'Non-archived campers' },
      { label: 'Net revenue', value: formatMoney(rows.reduce((sum, row) => sum + row.revenue, 0)) },
      { label: 'Bookings', value: formatNumber(rows.reduce((sum, row) => sum + row.bookings, 0)), sub: 'Overlapping the period' },
    ]
    table = {
      headers: ['Camper', 'Status', 'Bookings', 'Booked nights', 'Utilisation', 'Net revenue (KRW)'],
      alignRight: [2, 3, 4, 5],
      rows: rows.map((row) => [row.name, CAMPER_STATUS_META[row.status].label, formatNumber(row.bookings), formatNumber(row.bookedNights), formatPercent(row.utilization), formatMoney(row.revenue)]),
      csv: rows.map((row) => [row.name, row.status, row.bookings, row.bookedNights, Number(row.utilization.toFixed(4)), row.revenue]),
    }
  } else {
    state = { loading: customers.isLoading, error: customers.error, refetch: customers.refetch }
    const data = customers.data
    const rows = data?.series ?? []
    const added = rows.reduce((sum, row) => sum + row.registrations, 0)
    summary = [
      { label: 'New customers', value: formatNumber(added) },
      { label: 'Registered by period end', value: formatNumber(rows.at(-1)?.totalCustomers ?? 0) },
      { label: 'Returning customers', value: formatNumber(data?.returningInRange ?? 0), sub: data ? `of ${formatNumber(data.bookingCustomersInRange)} who booked` : undefined },
      { label: 'Top spender', value: data?.topCustomers[0] ? fullName(data.topCustomers[0]) : '—', sub: data?.topCustomers[0] ? formatMoney(data.topCustomers[0].spent) : undefined },
    ]
    table = {
      headers: ['Period', 'New customers', 'Total registered'],
      alignRight: [1, 2],
      rows: rows.map((row) => [label(row.period), formatNumber(row.registrations), formatNumber(row.totalCustomers)]),
      csv: rows.map((row) => [row.period, row.registrations, row.totalCustomers]),
    }
  }

  const download = () => {
    if (!table || table.csv.length === 0) return toast.info('There is no data to export for this period.')
    const headers = report === 'fleet' ? table.headers : ['Period start', ...table.headers.slice(1)]
    downloadCsv(`fullcamper-${report}-${range.from}_${range.to}${report === 'fleet' ? '' : `-${range.interval}`}.csv`, headers, table.csv)
    if (report === 'customers' && customers.data?.topCustomers.length) {
      downloadCsv(
        `fullcamper-top-customers-${range.from}_${range.to}.csv`,
        ['Customer', 'Email', 'Net spent (KRW)', 'Payments'],
        customers.data.topCustomers.map((customer) => [fullName(customer), customer.email, customer.spent, customer.payments]),
      )
    }
    toast.success('Report downloaded.')
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Summaries for any period, exportable as CSV (opens in Excel). Money is whole KRW; revenue is net of refunds."
        breadcrumbs={[{ label: 'Business' }, { label: 'Reports' }]}
        actions={<DateRangeControl range={range} />}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-3 pt-1 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <Tabs label="Report" tabs={REPORTS} value={report} onChange={setReport} />
          </div>
          <div className="flex items-center gap-2 px-2 pb-3 lg:pb-0">
            {report !== 'fleet' && <Segmented label="Group by" options={INTERVALS} value={range.interval} onChange={range.setInterval} />}
            <Button size="sm" variant="primary" icon={<Download className="h-3.5 w-3.5" />} onClick={download} disabled={state.loading || !table}>
              Export CSV
            </Button>
          </div>
        </div>
        {state.loading ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-14" />
            <Skeleton className="h-64" />
          </div>
        ) : state.error ? (
          <ErrorState error={state.error} onRetry={state.refetch} />
        ) : (
          <>
            <Summary items={summary} />
            {table && <Table table={table} />}
          </>
        )}
      </Card>
    </>
  )
}
