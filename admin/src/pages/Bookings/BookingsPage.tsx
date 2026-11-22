import { CalendarDays, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, SearchInput, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Segmented'
import { useDebouncedValue } from '@/hooks/common'
import { useListParams } from '@/hooks/useListParams'
import { useBookingsQuery, useCampersQuery, useCustomerQuery, useOverviewQuery, type BookingListArgs } from '@/services/endpoints'
import { BOOKING_STATUSES, type Booking, type BookingStatus } from '@/types/api'
import { addDays, isDateString } from '@/utils/dates'
import { formatDate, formatMoney, fullName, pluralize } from '@/utils/format'
import { BOOKING_STATUS_META } from '@/utils/status'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'start_asc', label: 'Pickup: soonest' },
  { value: 'start_desc', label: 'Pickup: latest' },
  { value: 'total_desc', label: 'Highest value' },
] as const

const columns: Column<Booking>[] = [
  {
    key: 'number',
    header: 'Booking',
    cell: (booking) => (
      <div className="min-w-0">
        <Link to={`/bookings/${booking._id}`} className="font-medium text-fg tabular hover:underline">
          {booking.bookingNumber}
        </Link>
        <p className="text-xs text-fg-3">{formatDate(booking.createdAt)}</p>
      </div>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    cell: (booking) => (
      <div className="min-w-0 max-w-52">
        <p className="truncate font-medium text-fg">{fullName(booking.customer)}</p>
        <p className="truncate text-xs text-fg-3">{booking.customer?.email ?? booking.driver.phone}</p>
      </div>
    ),
  },
  { key: 'camper', header: 'Camper', hideBelow: 'lg', cell: (booking) => <span className="line-clamp-1 max-w-48 text-fg-2">{booking.camper?.name ?? 'Removed camper'}</span> },
  {
    key: 'dates',
    header: 'Pickup → Return',
    cell: (booking) => (
      <div className="whitespace-nowrap">
        <p className="text-fg tabular">
          {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
        </p>
        <p className="text-xs text-fg-3">{pluralize(booking.nights, 'night')}</p>
      </div>
    ),
  },
  { key: 'total', header: 'Total', align: 'right', cell: (booking) => <span className="font-medium text-fg">{formatMoney(booking.price.total, booking.price.currency)}</span> },
  { key: 'payment', header: 'Payment', hideBelow: 'md', cell: (booking) => <PaymentStatusBadge status={booking.paymentStatus} /> },
  { key: 'status', header: 'Status', cell: (booking) => <BookingStatusBadge status={booking.status} /> },
]

export default function BookingsPage() {
  const list = useListParams()
  const status = list.getList('status').filter((value): value is BookingStatus => (BOOKING_STATUSES as readonly string[]).includes(value))
  const [search, setSearch] = useState(list.get('search'))
  const debouncedSearch = useDebouncedValue(search.trim())
  const camperId = list.get('camperId')
  const customerId = list.get('customerId')
  const from = isDateString(list.get('from')) ? list.get('from') : ''
  const to = isDateString(list.get('to')) ? list.get('to') : ''
  const sort = (SORTS.find((option) => option.value === list.get('sort'))?.value ?? 'newest') as BookingListArgs['sort']

  useEffect(() => {
    if (debouncedSearch !== list.get('search')) list.set({ search: debouncedSearch })
    // only react to the debounced value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const args: BookingListArgs = {
    page: list.page,
    limit: 20,
    status: status.length ? status : undefined,
    search: list.get('search') || undefined,
    camperId: camperId || undefined,
    customerId: customerId || undefined,
    from: from || undefined,
    // The UI date is inclusive; the API's `to` is exclusive.
    to: to ? addDays(to, 1) : undefined,
    sort,
  }
  const { data, error, isLoading, isFetching, refetch } = useBookingsQuery(args)
  const overview = useOverviewQuery()
  const campers = useCampersQuery({ page: 1, limit: 100, status: ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'ARCHIVED'], sort: 'newest' })
  const customer = useCustomerQuery(customerId, { skip: !customerId })

  const activeTab = status.length === 1 ? status[0]! : 'ALL'
  const counts = overview.data?.bookings.byStatus
  const hasFilters = Boolean(list.get('search') || camperId || customerId || from || to || status.length)

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every reservation, its payment state and lifecycle."
        breadcrumbs={[{ label: 'Management' }, { label: 'Bookings' }]}
        actions={
          <ButtonLink to="/bookings/calendar" icon={<CalendarDays className="h-4 w-4" />}>
            Calendar
          </ButtonLink>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-line px-3">
          <Tabs
            label="Booking status"
            value={activeTab}
            onChange={(value) => list.set({ status: value === 'ALL' ? null : value })}
            tabs={[
              { value: 'ALL', label: 'All', count: overview.data?.bookings.total },
              ...BOOKING_STATUSES.map((value) => ({ value, label: BOOKING_STATUS_META[value].label, count: counts?.[value] })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:flex-wrap lg:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Booking number, customer, driver…" className="lg:w-72" label="Search bookings" />
          <Select aria-label="Filter by camper" value={camperId} onChange={(e) => list.set({ camperId: e.target.value })} className="lg:w-52">
            <option value="">All campers</option>
            {campers.data?.items.map((camper) => (
              <option key={camper._id} value={camper._id}>
                {camper.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center gap-2">
            <Input type="date" aria-label="Stays from" value={from} max={to || undefined} onChange={(e) => list.set({ from: e.target.value })} className="w-full lg:w-40" />
            <span className="text-fg-3">–</span>
            <Input type="date" aria-label="Stays until" value={to} min={from || undefined} onChange={(e) => list.set({ to: e.target.value })} className="w-full lg:w-40" />
          </div>
          <Select aria-label="Sort" value={sort} onChange={(e) => list.set({ sort: e.target.value === 'newest' ? null : e.target.value })} className="lg:ml-auto lg:w-44">
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {(customerId || hasFilters) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-subtle px-4 py-2.5 text-xs">
            {customerId && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pr-1.5 pl-2.5 text-fg-2">
                Customer: <strong className="font-medium text-fg">{customer.data ? fullName(customer.data.customer) : '…'}</strong>
                <button type="button" onClick={() => list.set({ customerId: null })} className="rounded-full p-0.5 hover:bg-muted" aria-label="Remove customer filter">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(from || to) && <span className="text-fg-3">Showing stays that overlap the selected dates.</span>}
            {hasFilters && (
              <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => (setSearch(''), list.clear(['search', 'status', 'camperId', 'customerId', 'from', 'to']))}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        <DataTable
          caption="Bookings"
          columns={columns}
          rows={data?.items}
          rowKey={(booking) => booking._id}
          rowHref={(booking) => `/bookings/${booking._id}`}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={refetch}
          empty={
            <EmptyState
              title={hasFilters ? 'No bookings match these filters' : 'No bookings yet'}
              description={hasFilters ? 'Try a different status, camper or date range.' : 'Bookings made on the customer site will appear here.'}
            />
          }
        />
        <Pagination meta={data?.meta} onPageChange={list.setPage} label="bookings" />
      </Card>
    </>
  )
}
