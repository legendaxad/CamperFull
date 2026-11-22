import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Thumb } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useBookingsQuery, useCampersQuery } from '@/services/endpoints'
import type { Booking, BookingStatus } from '@/types/api'
import { cn } from '@/utils/cn'
import { addDays, addMonths, daysBetween, endOfMonth, startOfMonth, todayInKorea } from '@/utils/dates'
import { formatDate, fullName, pluralize } from '@/utils/format'
import { BOOKING_STATUS_META, CAMPER_STATUS_META } from '@/utils/status'

const SHOWN_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED']
const BAR_STYLES: Record<string, string> = {
  PENDING: 'bg-warning-soft text-warning ring-1 ring-warning/40 ring-inset',
  CONFIRMED: 'bg-info text-white dark:text-[#0b1424]',
  ACTIVE: 'bg-accent text-on-accent',
  COMPLETED: 'bg-success-soft text-success ring-1 ring-success/30 ring-inset',
}
const DAY_WIDTH = 40
const monthTitle = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow', timeZone: 'UTC' })

export default function BookingCalendarPage() {
  const [params, setParams] = useSearchParams()
  const today = todayInKorea()
  const monthParam = params.get('month')
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? `${monthParam}-01` : startOfMonth(today)
  const monthEnd = endOfMonth(month)
  const dayCount = daysBetween(month, monthEnd)
  const days = Array.from({ length: dayCount }, (_, index) => addDays(month, index))

  const campers = useCampersQuery({ page: 1, limit: 100, sort: 'newest' })
  // Bookings overlapping the month; the API's `to` is exclusive.
  const bookings = useBookingsQuery({ page: 1, limit: 100, from: month, to: addDays(monthEnd, 1), status: SHOWN_STATUSES, sort: 'start_asc' })

  const byCamper = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const booking of bookings.data?.items ?? []) {
      const key = booking.camper?._id
      if (!key) continue
      map.set(key, [...(map.get(key) ?? []), booking])
    }
    return map
  }, [bookings.data])

  const goTo = (target: string) => setParams({ month: target.slice(0, 7) }, { replace: true })
  const loading = campers.isLoading || bookings.isLoading
  const error = campers.error ?? bookings.error

  return (
    <>
      <PageHeader
        title="Booking calendar"
        description="Reservations per camper. Pickup day is included, the return day is free for the next rental."
        breadcrumbs={[{ label: 'Bookings', to: '/bookings' }, { label: 'Calendar' }]}
        actions={
          <ButtonLink to="/bookings" icon={<List className="h-4 w-4" />}>
            List view
          </ButtonLink>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" onClick={() => goTo(addMonths(month, -1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => goTo(addMonths(month, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-base font-semibold text-fg">{monthTitle.format(new Date(`${month}T00:00:00Z`))}</h2>
          <Button size="sm" variant="secondary" onClick={() => goTo(today)} disabled={month === startOfMonth(today)}>
            Today
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-fg-3">
            {SHOWN_STATUSES.map((status) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-4 rounded-sm', BAR_STYLES[status])} aria-hidden />
                {BOOKING_STATUS_META[status].label}
              </span>
            ))}
          </div>
        </div>

        {bookings.data && bookings.data.meta.total > bookings.data.items.length && (
          <p className="border-b border-line bg-warning-soft px-4 py-2 text-xs text-warning">
            Showing the first {bookings.data.items.length} of {bookings.data.meta.total} bookings this month. Use the list view filters for the rest.
          </p>
        )}

        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => (campers.refetch(), bookings.refetch())} />
        ) : campers.data?.items.length === 0 ? (
          <EmptyState title="No campers yet" description="Add a camper to start taking reservations." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <div style={{ minWidth: 220 + dayCount * DAY_WIDTH }}>
              <div className="sticky top-0 z-10 flex border-b border-line bg-subtle">
                <div className="sticky left-0 z-10 w-[220px] shrink-0 border-r border-line bg-subtle px-4 py-2 text-xs font-medium text-fg-3">Camper</div>
                {days.map((day) => {
                  const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay())
                  return (
                    <div key={day} style={{ width: DAY_WIDTH }} className={cn('shrink-0 py-1.5 text-center', weekend && 'bg-muted/60')}>
                      <p className="text-[10px] text-fg-3">{weekday.format(new Date(`${day}T00:00:00Z`))}</p>
                      <p className={cn('mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular', day === today ? 'bg-accent text-on-accent' : 'text-fg-2')}>
                        {Number(day.slice(8))}
                      </p>
                    </div>
                  )
                })}
              </div>
              {campers.data?.items.map((camper) => (
                <div key={camper._id} className="flex border-b border-line last:border-0">
                  <Link
                    to={`/campers/${camper._id}`}
                    className="sticky left-0 z-[5] flex w-[220px] shrink-0 items-center gap-2.5 border-r border-line bg-surface px-4 py-2.5 hover:bg-subtle"
                  >
                    <Thumb src={camper.images[0]?.url} alt="" className="h-8 w-10" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-fg">{camper.name}</span>
                      <span className="block text-[11px] text-fg-3">{camper.status === 'AVAILABLE' ? camper.location.region : CAMPER_STATUS_META[camper.status].label}</span>
                    </span>
                  </Link>
                  <div className="relative h-[52px] flex-1">
                    <div className="absolute inset-0 flex" aria-hidden>
                      {days.map((day) => {
                        const weekend = [0, 6].includes(new Date(`${day}T00:00:00Z`).getUTCDay())
                        return <div key={day} style={{ width: DAY_WIDTH }} className={cn('shrink-0 border-r border-line/60', weekend && 'bg-muted/40', day === today && 'bg-accent-soft/60')} />
                      })}
                    </div>
                    {(byCamper.get(camper._id) ?? []).map((booking) => {
                      const start = booking.startDate.slice(0, 10)
                      const end = booking.endDate.slice(0, 10)
                      // Clip to the visible month; the return day itself is free.
                      const visibleStart = start < month ? month : start
                      const lastNight = addDays(end, -1)
                      const visibleEnd = lastNight > monthEnd ? monthEnd : lastNight
                      const offset = daysBetween(month, visibleStart) - 1
                      const span = daysBetween(visibleStart, visibleEnd)
                      return (
                        <Link
                          key={booking._id}
                          to={`/bookings/${booking._id}`}
                          title={`${booking.bookingNumber} · ${fullName(booking.customer)} · ${formatDate(start)} → ${formatDate(end)} (${pluralize(booking.nights, 'night')}) · ${BOOKING_STATUS_META[booking.status].label}`}
                          className={cn(
                            'absolute top-2.5 flex h-8 items-center overflow-hidden px-2 text-[11px] font-medium whitespace-nowrap shadow-xs transition-[filter,transform] hover:-translate-y-px hover:brightness-105',
                            BAR_STYLES[booking.status],
                            start < month ? 'rounded-r-md' : 'rounded-md',
                            lastNight > monthEnd && 'rounded-r-none',
                          )}
                          style={{ left: offset * DAY_WIDTH + 2, width: Math.max(span * DAY_WIDTH - 4, 18) }}
                        >
                          <span className="truncate">{fullName(booking.customer)}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
