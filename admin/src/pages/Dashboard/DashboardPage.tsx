import { ArrowRight, CalendarDays, CalendarRange, Caravan, FileSpreadsheet, Plus, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BookingTrendChart } from '@/components/charts/BookingTrendChart'
import { RankedBars } from '@/components/charts/Distribution'
import { StatusDistribution } from '@/components/charts/Distribution'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { DateRangeControl } from '@/components/dashboard/DateRangeControl'
import { KpiGrid } from '@/components/dashboard/kpiDefinitions'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Thumb } from '@/components/ui/Avatar'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { useDateRange } from '@/hooks/useDateRange'
import { useBookingSeriesQuery, useKpisQuery, useOverviewQuery, useRevenueSeriesQuery, useTopCampersQuery } from '@/services/endpoints'
import { BOOKING_STATUSES } from '@/types/api'
import { addDays } from '@/utils/dates'
import { formatDate, formatMoney, formatNumber, formatRelative, fullName, pluralize } from '@/utils/format'
import { BOOKING_STATUS_META } from '@/utils/status'

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).format(new Date()))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardPage() {
  const admin = useCurrentAdmin()
  const range = useDateRange('30d')
  const args = { from: range.from, to: range.to, interval: range.interval }
  const previousArgs = { from: addDays(range.from, -range.days), to: addDays(range.from, -1), interval: range.interval }

  const kpis = useKpisQuery(args)
  const revenue = useRevenueSeriesQuery(args)
  const previousRevenue = useRevenueSeriesQuery(previousArgs)
  const bookings = useBookingSeriesQuery(args)
  const topCampers = useTopCampersQuery({ ...args, limit: 5 })
  const overview = useOverviewQuery()

  const byStatus = kpis.data?.current.bookings.byStatus
  const comparable = previousRevenue.data && revenue.data && previousRevenue.data.length === revenue.data.length

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${admin.firstName}`}
        documentTitle="Dashboard"
        description="Here is how FullCamper is performing. All figures come from live booking and payment records."
        actions={<DateRangeControl range={range} />}
      />

      <KpiGrid data={kpis.data} loading={kpis.isLoading} />
      {kpis.error && !kpis.data && (
        <Card className="mt-4">
          <ErrorState error={kpis.error} onRetry={kpis.refetch} compact />
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Revenue"
            description={
              kpis.data ? (
                <>
                  <span className="font-medium text-fg tabular">{formatMoney(kpis.data.current.revenue)}</span> net captured · refunds deducted
                </>
              ) : (
                'Net captured revenue, refunds deducted'
              )
            }
            action={
              <Link to={`/analytics?${new URLSearchParams({ from: range.from, to: range.to })}`} className="text-[13px] font-medium text-accent-ink hover:underline">
                Analytics
              </Link>
            }
          />
          <div className="px-4 pb-4">
            {revenue.isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : revenue.error ? (
              <ErrorState error={revenue.error} onRetry={revenue.refetch} compact />
            ) : (
              revenue.data && <RevenueChart data={revenue.data} previous={comparable ? previousRevenue.data : undefined} interval={range.interval} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Booking status" description="Bookings created in this period, by current status" />
          <div className="px-5 pb-5">
            {kpis.isLoading || !byStatus ? (
              <Skeleton className="h-32" />
            ) : (
              <StatusDistribution
                total={kpis.data?.current.bookings.total ?? 0}
                items={BOOKING_STATUSES.map((status) => ({
                  key: status,
                  label: BOOKING_STATUS_META[status].label,
                  value: byStatus[status],
                  tone: BOOKING_STATUS_META[status].tone,
                  description: BOOKING_STATUS_META[status].description,
                }))}
              />
            )}
            {kpis.data && kpis.data.current.expiredUnpaid > 0 && (
              <p className="mt-4 rounded-lg bg-subtle px-3 py-2 text-xs text-fg-3">
                {pluralize(kpis.data.current.expiredUnpaid, 'cancellation')} were unpaid holds that expired automatically and are excluded from the cancellation rate.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Booking trends" description="Bookings created per period and how they ended up" />
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
          <CardHeader
            title="Top campers"
            description="By booking value (confirmed bookings created in the period)"
            action={
              <Link to="/campers" className="text-[13px] font-medium text-accent-ink hover:underline">
                Fleet
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {topCampers.isLoading ? (
              <div className="flex flex-col gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9" />
                ))}
              </div>
            ) : topCampers.error ? (
              <ErrorState error={topCampers.error} onRetry={topCampers.refetch} compact />
            ) : (
              <RankedBars
                items={(topCampers.data ?? []).map((camper) => ({
                  key: camper.camperId,
                  label: (
                    <Link to={`/campers/${camper.camperId}`} className="hover:underline">
                      {camper.name}
                    </Link>
                  ),
                  value: camper.revenue,
                  display: formatMoney(camper.revenue),
                  sublabel: `${pluralize(camper.bookings, 'booking')} · ${pluralize(camper.nights, 'night')}`,
                  leading: <Thumb src={camper.image} alt="" className="h-10 w-10" />,
                }))}
                empty={<EmptyState compact title="No confirmed bookings yet" description="Campers appear here once bookings in this period are confirmed." />}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader
            title="Recent bookings"
            action={
              <ButtonLink to="/bookings" size="sm" variant="ghost">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          {overview.isLoading ? (
            <div className="flex flex-col gap-3 px-5 pb-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : overview.error ? (
            <ErrorState error={overview.error} onRetry={overview.refetch} compact />
          ) : overview.data?.recentBookings.length === 0 ? (
            <EmptyState compact title="No bookings yet" description="New bookings from the customer site will appear here." />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {overview.data?.recentBookings.map((booking) => (
                <li key={booking._id}>
                  <Link to={`/bookings/${booking._id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-subtle">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
                        <span className="tabular">{booking.bookingNumber}</span>
                        <span className="hidden truncate font-normal text-fg-3 sm:inline">· {booking.camper?.name ?? 'Removed camper'}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-fg-3">
                        {fullName(booking.customer)} · {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
                      </p>
                    </div>
                    <span className="hidden text-[13px] font-medium text-fg tabular sm:block">{formatMoney(booking.price.total)}</span>
                    <BookingStatusBadge status={booking.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Alerts" description="Live operational status" />
          <div className="border-t border-line">
            {kpis.data ? <AlertsPanel snapshot={kpis.data.snapshot} /> : <Skeleton className="m-5 h-24" />}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader
            title="New customers"
            description={overview.data ? `${formatNumber(overview.data.customers.newLast30Days)} in the last 30 days` : undefined}
            action={
              <ButtonLink to="/customers" size="sm" variant="ghost">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            }
          />
          {overview.data?.recentCustomers.length === 0 ? (
            <EmptyState compact title="No customers yet" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {(overview.data?.recentCustomers ?? []).map((customer) => (
                <li key={customer._id}>
                  <Link to={`/customers/${customer._id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                    <Avatar name={fullName(customer)} src={customer.avatar?.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{fullName(customer)}</span>
                      <span className="block truncate text-xs text-fg-3">{customer.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-3">{formatRelative(customer.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Upcoming pickups" description="Confirmed reservations starting soon" />
          {overview.data?.upcomingReservations.length === 0 ? (
            <EmptyState compact icon={<CalendarDays className="h-4 w-4" />} title="No upcoming pickups" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {(overview.data?.upcomingReservations ?? []).slice(0, 5).map((booking) => (
                <li key={booking._id}>
                  <Link to={`/bookings/${booking._id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                      <span className="text-[10px] leading-none font-semibold uppercase">{new Date(booking.startDate).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}</span>
                      <span className="text-sm leading-tight font-semibold">{new Date(booking.startDate).getUTCDate()}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{booking.camper?.name ?? 'Removed camper'}</span>
                      <span className="block truncate text-xs text-fg-3">
                        {fullName(booking.customer)} · {pluralize(booking.nights, 'night')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <div className="grid grid-cols-2 gap-2 px-5 pb-5">
            {[
              { to: '/campers/new', label: 'Add camper', icon: Plus },
              { to: '/bookings?status=PENDING', label: 'Review pending', icon: CalendarRange },
              { to: '/bookings/calendar', label: 'Booking calendar', icon: CalendarDays },
              { to: '/customers', label: 'Find customer', icon: Users },
              { to: '/campers?status=MAINTENANCE', label: 'Maintenance', icon: Caravan },
              { to: '/reports', label: 'Export reports', icon: FileSpreadsheet },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col gap-2 rounded-xl border border-line p-3 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-accent-soft/40"
              >
                <action.icon className="h-4 w-4 text-accent-ink" aria-hidden />
                <span className="text-[13px] font-medium text-fg">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
