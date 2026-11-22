import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookingTrendChart } from '@/components/charts/BookingTrendChart'
import { CustomerGrowthChart } from '@/components/charts/CustomerGrowthChart'
import { RankedBars, StatusDistribution } from '@/components/charts/Distribution'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { DateRangeControl } from '@/components/dashboard/DateRangeControl'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Thumb } from '@/components/ui/Avatar'
import { CamperStatusBadge } from '@/components/ui/Badge'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Segmented } from '@/components/ui/Segmented'
import { useDateRange } from '@/hooks/useDateRange'
import { useBookingSeriesQuery, useCustomerAnalyticsQuery, useFleetQuery, useKpisQuery, usePaymentSummaryQuery, useRevenueSeriesQuery } from '@/services/endpoints'
import { BOOKING_STATUSES, type Interval } from '@/types/api'
import { addDays } from '@/utils/dates'
import { formatMoney, formatNumber, formatPercent, fullName, pluralize } from '@/utils/format'
import { BOOKING_STATUS_META } from '@/utils/status'

const INTERVALS: { value: Interval; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-fg-3">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-fg tabular">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-fg-3">{sub}</p>}
    </div>
  )
}

function change(current: number, previous: number): string {
  if (previous === 0) return current === 0 ? 'No change' : 'No revenue in the previous period'
  const ratio = (current - previous) / previous
  return `${ratio >= 0 ? '+' : ''}${formatPercent(ratio)} vs previous period`
}

export default function AnalyticsPage() {
  const range = useDateRange('90d')
  const { hash } = useLocation()
  const args = { from: range.from, to: range.to, interval: range.interval }
  const previousArgs = { from: addDays(range.from, -range.days), to: addDays(range.from, -1), interval: range.interval }

  const kpis = useKpisQuery(args)
  const revenue = useRevenueSeriesQuery(args)
  const previousRevenue = useRevenueSeriesQuery(previousArgs)
  const bookings = useBookingSeriesQuery(args)
  const fleet = useFleetQuery(args)
  const customers = useCustomerAnalyticsQuery({ ...args, limit: 8 })
  const payments = usePaymentSummaryQuery(args)

  useEffect(() => {
    if (!hash) return
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    return () => window.clearTimeout(timer)
  }, [hash])

  const current = kpis.data?.current
  const previous = kpis.data?.previous
  const comparable = previousRevenue.data && revenue.data && previousRevenue.data.length === revenue.data.length
  const totalCapacity = fleet.data ? fleet.data.campers.length * range.days : 0

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Revenue, bookings, fleet and customers. Revenue is net of refunds, from captured payments only."
        breadcrumbs={[{ label: 'Overview', to: '/' }, { label: 'Analytics' }]}
        actions={<DateRangeControl range={range} />}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 text-[13px]" aria-label="Sections">
          {[
            ['revenue', 'Revenue'],
            ['bookings', 'Bookings'],
            ['fleet', 'Fleet'],
            ['customers', 'Customers'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-lg px-3 py-1.5 font-medium text-fg-3 transition-colors hover:bg-muted hover:text-fg">
              {label}
            </a>
          ))}
        </nav>
        <Segmented label="Chart interval" options={INTERVALS} value={range.interval} onChange={range.setInterval} />
      </div>

      {/* Revenue */}
      <section id="revenue" className="scroll-mt-24">
        <Card>
          <CardHeader title="Revenue" description="Net revenue by capture date, compared with the previous period of equal length" />
          <div className="grid grid-cols-2 gap-4 border-y border-line px-5 py-4 lg:grid-cols-4">
            {payments.data && current && previous ? (
              <>
                <Stat label="Net revenue" value={formatMoney(current.revenue)} sub={change(current.revenue, previous.revenue)} />
                <Stat label="Gross captured" value={formatMoney(payments.data.captured.gross)} sub={pluralize(payments.data.captured.count, 'payment')} />
                <Stat label="Refunded (of those payments)" value={formatMoney(payments.data.captured.refunded)} />
                <Stat label="Booking value (confirmed)" value={formatMoney(current.bookedValue)} sub="Not revenue until paid" />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)
            )}
          </div>
          <div className="p-4">
            {revenue.isLoading ? (
              <Skeleton className="h-[320px]" />
            ) : revenue.error ? (
              <ErrorState error={revenue.error} onRetry={revenue.refetch} compact />
            ) : (
              revenue.data && <RevenueChart data={revenue.data} previous={comparable ? previousRevenue.data : undefined} interval={range.interval} height={320} />
            )}
          </div>
        </Card>
      </section>

      {/* Bookings */}
      <section id="bookings" className="mt-6 grid scroll-mt-24 grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Booking trends" description="Bookings created per period" />
          <div className="px-4 pb-4">
            {bookings.isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : bookings.error ? (
              <ErrorState error={bookings.error} onRetry={bookings.refetch} compact />
            ) : (
              bookings.data && <BookingTrendChart data={bookings.data} interval={range.interval} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Confirmed vs cancelled" description="Bookings created in the period" />
          <div className="px-5 pb-5">
            {current ? (
              <>
                <div className="mb-5 grid grid-cols-2 gap-4">
                  <Stat label="Confirmed" value={formatNumber(current.bookedCount)} sub="Confirmed, active or completed" />
                  <Stat
                    label="Cancellation rate"
                    value={current.cancellationRate === null ? '—' : formatPercent(current.cancellationRate)}
                    sub={`${formatNumber(current.cancelledAfterConfirmation)} cancelled after confirming`}
                  />
                  <Stat label="Rejected" value={formatNumber(current.rejected)} />
                  <Stat label="Expired unpaid holds" value={formatNumber(current.expiredUnpaid)} />
                </div>
                <StatusDistribution
                  total={current.bookings.total}
                  items={BOOKING_STATUSES.map((status) => ({
                    key: status,
                    label: BOOKING_STATUS_META[status].label,
                    value: current.bookings.byStatus[status],
                    tone: BOOKING_STATUS_META[status].tone,
                  }))}
                />
                {kpis.data && kpis.data.snapshot.pendingBookings > 0 && (
                  <Link to="/bookings?status=PENDING" className="mt-4 block rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-warning hover:underline">
                    {pluralize(kpis.data.snapshot.pendingBookings, 'pending booking request')} right now →
                  </Link>
                )}
              </>
            ) : kpis.error ? (
              <ErrorState error={kpis.error} onRetry={kpis.refetch} compact />
            ) : (
              <Skeleton className="h-56" />
            )}
          </div>
        </Card>
      </section>

      {/* Fleet */}
      <section id="fleet" className="mt-6 scroll-mt-24">
        <Card className="overflow-hidden">
          <CardHeader
            title="Fleet utilisation"
            description="Booked nights inside the period per camper (confirmed, active and completed), and net revenue collected for its bookings"
          />
          <div className="grid grid-cols-2 gap-4 border-y border-line px-5 py-4 lg:grid-cols-4">
            {current && kpis.data ? (
              <>
                <Stat label="Occupancy rate" value={current.occupancyRate === null ? '—' : formatPercent(current.occupancyRate)} sub={`${formatNumber(current.bookedNights)} of ${formatNumber(current.fleetSize * range.days)} camper-nights`} />
                <Stat label="Fleet size" value={formatNumber(kpis.data.snapshot.fleetSize)} sub="Excluding archived" />
                <Stat label="Available now" value={formatNumber(kpis.data.snapshot.activeCampers)} />
                <Stat label="In maintenance" value={formatNumber(kpis.data.snapshot.campersByStatus.MAINTENANCE)} />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)
            )}
          </div>
          {fleet.isLoading ? (
            <Skeleton className="m-5 h-48" />
          ) : fleet.error ? (
            <ErrorState error={fleet.error} onRetry={fleet.refetch} compact />
          ) : fleet.data && fleet.data.campers.length === 0 ? (
            <EmptyState compact title="No campers in the fleet" description="Add campers to see utilisation." />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-subtle text-left text-xs text-fg-3">
                    <th className="h-10 px-5 font-medium">Camper</th>
                    <th className="px-4 font-medium">Status</th>
                    <th className="w-[32%] px-4 font-medium">Utilisation</th>
                    <th className="px-4 text-right font-medium">Bookings</th>
                    <th className="px-4 text-right font-medium">Nights</th>
                    <th className="px-5 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.data?.campers.map((camper) => (
                    <tr key={camper.camperId} className="border-b border-line last:border-0">
                      <td className="px-5 py-3">
                        <Link to={`/campers/${camper.camperId}`} className="flex items-center gap-3 hover:underline">
                          <Thumb src={camper.image} alt="" className="h-9 w-12" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-fg">{camper.name}</span>
                            <span className="block text-xs text-fg-3">{camper.occupiedToday ? 'Reserved today' : 'Free today'}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4">
                        <CamperStatusBadge status={camper.status} />
                      </td>
                      <td className="px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-[var(--c-chart-1)] transition-[width] duration-700" style={{ width: `${Math.min(100, camper.utilization * 100)}%` }} />
                          </div>
                          <span className="w-12 text-right text-xs font-medium text-fg tabular">{formatPercent(camper.utilization, 0)}</span>
                        </div>
                      </td>
                      <td className="px-4 text-right tabular">{formatNumber(camper.bookings)}</td>
                      <td className="px-4 text-right tabular">{formatNumber(camper.bookedNights)}</td>
                      <td className="px-5 text-right font-medium tabular">{formatMoney(camper.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalCapacity > 0 && <p className="border-t border-line px-5 py-3 text-xs text-fg-3">Utilisation = booked nights ÷ {formatNumber(range.days)} days in the period.</p>}
            </div>
          )}
        </Card>
      </section>

      {/* Customers */}
      <section id="customers" className="mt-6 grid scroll-mt-24 grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Customer growth" description="New registrations per period" />
          <div className="grid grid-cols-2 gap-4 border-y border-line px-5 py-4 lg:grid-cols-4">
            {customers.data ? (
              <>
                <Stat label="Registered by period end" value={formatNumber(customers.data.series.at(-1)?.totalCustomers ?? 0)} />
                <Stat label="New in period" value={formatNumber(customers.data.series.reduce((sum, point) => sum + point.registrations, 0))} />
                <Stat
                  label="Returning customers"
                  value={formatNumber(customers.data.returningInRange)}
                  sub={`of ${pluralize(customers.data.bookingCustomersInRange, 'booking customer')} this period`}
                />
                <Stat
                  label="Repeat rate (all time)"
                  value={customers.data.customersWithBookings ? formatPercent(customers.data.repeatCustomers / customers.data.customersWithBookings) : '—'}
                  sub={`${formatNumber(customers.data.repeatCustomers)} with 2+ confirmed bookings`}
                />
              </>
            ) : (
              [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)
            )}
          </div>
          <div className="p-4">
            {customers.isLoading ? (
              <Skeleton className="h-[240px]" />
            ) : customers.error ? (
              <ErrorState error={customers.error} onRetry={customers.refetch} compact />
            ) : (
              customers.data && <CustomerGrowthChart data={customers.data.series} interval={range.interval} />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top customers" description="By net payments captured in the period" />
          <div className="px-5 pb-5">
            {customers.isLoading ? (
              <Skeleton className="h-56" />
            ) : (
              <RankedBars
                items={(customers.data?.topCustomers ?? []).map((customer) => ({
                  key: customer.customerId,
                  label: (
                    <Link to={`/customers/${customer.customerId}`} className="hover:underline">
                      {fullName(customer)}
                    </Link>
                  ),
                  value: customer.spent,
                  display: formatMoney(customer.spent),
                  sublabel: pluralize(customer.payments, 'payment'),
                  leading: <Avatar name={fullName(customer)} src={customer.avatar} />,
                }))}
                empty={<EmptyState compact title="No payments in this period" />}
              />
            )}
          </div>
        </Card>
      </section>
    </>
  )
}
