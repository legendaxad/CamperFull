import { CalendarCheck, CalendarDays, ChevronRight, MapPin, Users } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperImage } from '@/components/camper/CamperImage'
import { ButtonLink } from '@/components/common/Button'
import { Badge, EmptyState, ErrorState } from '@/components/common/Feedback'
import { Pagination } from '@/components/common/Pagination'
import { ROUTES } from '@/constants/navigation'
import { fetchBookings, selectBookingList, selectListedBookings } from '@/features/bookings/bookingSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { BookingScope } from '@/services/bookingApi'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_TONES, camperLocation, coverImage } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatDate, formatPrice, pluralize } from '@/utils/format'

const SCOPES: { id: BookingScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
]

/** "My orders" (Figma frame 0:1556) — GET /bookings with scope + pagination. */
export default function BookingsPage() {
  useDocumentTitle('My orders')
  const dispatch = useAppDispatch()
  const [params, setParams] = useSearchParams()
  const scope = (SCOPES.find((s) => s.id === params.get('scope'))?.id ?? 'all') as BookingScope
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = useAppSelector(selectBookingList)
  const bookings = useAppSelector(selectListedBookings)

  useEffect(() => {
    void dispatch(fetchBookings({ page, scope }))
  }, [dispatch, page, scope, list.key])

  const setQuery = (next: { scope?: BookingScope; page?: number }) => {
    const query = new URLSearchParams()
    const s = next.scope ?? scope
    const p = next.page ?? 1
    if (s !== 'all') query.set('scope', s)
    if (p > 1) query.set('page', String(p))
    setParams(query)
  }

  const loading = list.status === 'idle' || list.status === 'loading'

  return (
    <div className="container-page py-10 md:py-14">
      <div className="text-center">
        <h1 className="section-title text-[32px]">My orders</h1>
      </div>

      <div role="tablist" aria-label="Booking period" className="mx-auto mt-8 flex w-fit rounded-[12px] bg-white p-1 shadow-card">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={scope === s.id}
            onClick={() => setQuery({ scope: s.id })}
            className={cn('rounded-[10px] px-5 py-2 text-sm font-semibold transition', scope === s.id ? 'bg-brand text-white' : 'text-muted hover:text-ink')}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {list.status === 'failed' ? (
          <ErrorState message={list.error ?? 'Bookings could not be loaded.'} onRetry={() => void dispatch(fetchBookings({ page, scope }))} />
        ) : loading ? (
          <div className="space-y-4" role="status" aria-label="Loading bookings">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-[20px]" />)}
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={scope === 'all' ? 'No bookings yet' : `No ${scope} bookings`}
            description="When you book a camper it will appear here with all the trip details."
            action={<ButtonLink to={ROUTES.campers}>Plan a trip</ButtonLink>}
          />
        ) : (
          <ul className="space-y-4">
            {bookings.map((booking) => (
              <li key={booking._id}>
                <Link
                  to={ROUTES.booking(booking._id)}
                  className="group grid gap-5 rounded-[20px] bg-white p-5 shadow-card transition hover:shadow-raised sm:grid-cols-[200px_1fr_auto] md:p-6"
                >
                  <CamperImage src={booking.camper ? coverImage(booking.camper) : ''} alt="" rounded={false} className="h-32 w-full" />
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-[#5c5c5c]">№ {booking.bookingNumber}</span>
                      <Badge tone={BOOKING_STATUS_TONES[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-base font-semibold">{booking.camper?.name ?? 'Camper no longer listed'}</h2>
                      <p className="text-xl font-bold text-brand">{formatPrice(booking.price.total, booking.price.currency)}</p>
                    </div>
                    <dl className="mt-auto grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                      {booking.camper && (
                        <div className="flex items-center gap-2"><MapPin className="size-4 text-brand" aria-hidden /><dt className="sr-only">Location</dt><dd>{camperLocation(booking.camper)}</dd></div>
                      )}
                      <div className="flex items-center gap-2"><CalendarDays className="size-4 text-brand" aria-hidden /><dt className="sr-only">Dates</dt><dd>{formatDate(booking.startDate)} – {formatDate(booking.endDate)} ({pluralize(booking.nights, 'night')})</dd></div>
                      <div className="flex items-center gap-2"><Users className="size-4 text-brand" aria-hidden /><dt className="sr-only">Driver</dt><dd>{booking.driver.fullName}</dd></div>
                    </dl>
                  </div>
                  <ChevronRight className="hidden size-5 self-center text-muted transition group-hover:translate-x-1 sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <Pagination page={list.meta?.page ?? page} total={list.meta?.totalPages ?? 1} onChange={(p) => setQuery({ page: p })} />
      </div>
    </div>
  )
}
