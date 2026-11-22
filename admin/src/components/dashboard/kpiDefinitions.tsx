import { BadgePercent, CalendarCheck2, Caravan, CircleDollarSign, Gauge, Hourglass, Receipt, Users } from 'lucide-react'
import type { KpiResponse } from '@/types/api'
import { formatMoney, formatNumber, formatPercent, pluralize } from '@/utils/format'
import { KpiCard } from './KpiCard'

const money = (value: number) => formatMoney(value)
const count = (value: number) => formatNumber(Math.round(value))
const percent = (value: number) => formatPercent(value)

/** The eight headline KPIs. Period metrics compare with the previous range; snapshots describe "now". */
export function KpiGrid({ data, loading }: { data: KpiResponse | undefined; loading: boolean }) {
  const current = data?.current
  const previous = data?.previous
  const snapshot = data?.snapshot
  const label = 'previous period'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        index={0}
        title="Total revenue"
        icon={CircleDollarSign}
        loading={loading}
        value={current?.revenue ?? null}
        format={money}
        href="/payments"
        comparison={previous ? { previous: previous.revenue, kind: 'change', label } : undefined}
      />
      <KpiCard
        index={1}
        title="Total bookings"
        icon={CalendarCheck2}
        loading={loading}
        value={current?.bookings.total ?? null}
        format={count}
        href="/bookings"
        comparison={previous ? { previous: previous.bookings.total, kind: 'change', label } : undefined}
      />
      <KpiCard
        index={2}
        title="Active campers"
        icon={Caravan}
        loading={loading}
        value={snapshot?.activeCampers ?? null}
        format={count}
        href="/campers"
        hint={snapshot ? `Available now · ${pluralize(snapshot.fleetSize, 'camper')} in fleet` : undefined}
      />
      <KpiCard
        index={3}
        title="Total customers"
        icon={Users}
        loading={loading}
        value={snapshot?.totalCustomers ?? null}
        format={count}
        href="/customers"
        hint={current ? `${formatNumber(current.newCustomers)} new in this period` : undefined}
      />
      <KpiCard
        index={4}
        title="Occupancy rate"
        icon={Gauge}
        loading={loading}
        value={current?.occupancyRate ?? null}
        format={percent}
        href="/analytics#fleet"
        unavailable="No bookable campers in this period"
        comparison={previous ? { previous: previous.occupancyRate, kind: 'points', label } : undefined}
      />
      <KpiCard
        index={5}
        title="Avg. booking value"
        icon={Receipt}
        loading={loading}
        value={current?.averageBookingValue ?? null}
        format={money}
        unavailable="No confirmed bookings in this period"
        comparison={previous ? { previous: previous.averageBookingValue, kind: 'change', label } : undefined}
      />
      <KpiCard
        index={6}
        title="Pending bookings"
        icon={Hourglass}
        loading={loading}
        value={snapshot?.pendingBookings ?? null}
        format={count}
        href="/bookings?status=PENDING"
        hint="Awaiting payment right now"
      />
      <KpiCard
        index={7}
        title="Cancellation rate"
        icon={BadgePercent}
        loading={loading}
        value={current?.cancellationRate ?? null}
        format={percent}
        unavailable="No confirmed bookings in this period"
        comparison={previous ? { previous: previous.cancellationRate, kind: 'points', invert: true, label } : undefined}
      />
    </div>
  )
}
