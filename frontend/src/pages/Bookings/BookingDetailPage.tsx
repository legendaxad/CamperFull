import { ArrowLeft, CalendarDays, CreditCard, MapPin, Star, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperImage } from '@/components/camper/CamperImage'
import { PriceBreakdownList } from '@/components/camper/PriceBreakdownList'
import { Button } from '@/components/common/Button'
import { Badge, ErrorState, Skeleton } from '@/components/common/Feedback'
import { Modal } from '@/components/common/Modal'
import { TextArea } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import { cancelReasonSchema } from '@/features/bookings/bookingSchemas'
import {
  cancelBooking,
  fetchBooking,
  payBooking,
  selectBookingById,
  selectBookingDetailRequest,
  selectIsBookingPending,
} from '@/features/bookings/bookingSlice'
import { selectSettings } from '@/features/content/contentSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import NotFoundPage from '../NotFound/NotFoundPage'
import { describeError } from '@/services/api/errors'
import { reviewApi } from '@/services/bookingApi'
import type { Booking, OwnReview } from '@/types/api'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_TONES, camperLocation, coverImage } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatDate, formatDateTime } from '@/utils/format'

function useCountdown(until: string | undefined): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [until])
  if (!until) return null
  return Math.max(0, new Date(until).getTime() - now)
}

const formatRemaining = (ms: number) => {
  const total = Math.floor(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Booking details, payment (PENDING), cancellation and post-trip review. */
export default function BookingDetailPage() {
  const { id = '' } = useParams()
  const dispatch = useAppDispatch()
  const booking = useAppSelector((state) => selectBookingById(state, id))
  const request = useAppSelector((state) => selectBookingDetailRequest(state, id))
  useDocumentTitle(booking ? `Booking ${booking.bookingNumber}` : 'Booking')

  useEffect(() => {
    void dispatch(fetchBooking(id))
  }, [dispatch, id])

  if (!booking) {
    if (request?.status === 'failed') {
      return /not found/i.test(request.error ?? '') ? (
        <NotFoundPage />
      ) : (
        <div className="container-page py-16"><ErrorState message={request.error ?? 'Booking could not be loaded.'} onRetry={() => void dispatch(fetchBooking(id))} /></div>
      )
    }
    return (
      <div className="container-page space-y-4 py-14" role="status" aria-label="Loading booking">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-64 w-full rounded-[20px]" />
      </div>
    )
  }
  return <BookingDetail booking={booking} />
}

function BookingDetail({ booking }: { booking: Booking }) {
  const dispatch = useAppDispatch()
  const settings = useAppSelector(selectSettings)
  const busy = useAppSelector((state) => selectIsBookingPending(state, booking._id))
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const remaining = useCountdown(booking.status === 'PENDING' ? booking.holdExpiresAt : undefined)
  const holdExpired = remaining !== null && remaining <= 0

  const pay = async () => {
    const result = await dispatch(payBooking(booking._id))
    if (payBooking.fulfilled.match(result)) dispatch(showToast(`Payment received — booking ${booking.bookingNumber} is confirmed!`))
    else if (result.payload) dispatch(showToast(result.payload, 'error'))
  }

  const confirmCancel = async () => {
    const parsed = cancelReasonSchema.safeParse(reason)
    const result = await dispatch(cancelBooking({ id: booking._id, reason: parsed.success && parsed.data ? parsed.data : undefined }))
    setCancelOpen(false)
    if (cancelBooking.fulfilled.match(result)) {
      dispatch(showToast(`Booking ${booking.bookingNumber} was cancelled`, 'info'))
      void dispatch(fetchBooking(booking._id))
    } else if (result.payload) {
      dispatch(showToast(result.payload, 'error'))
    }
  }

  const cancellable = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  return (
    <div className="container-page py-10 md:py-14">
      <Link to={ROUTES.bookings} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> My orders
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold md:text-3xl">№ {booking.bookingNumber}</h1>
        <Badge tone={BOOKING_STATUS_TONES[booking.status]}>{BOOKING_STATUS_LABELS[booking.status]}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">Booked {formatDateTime(booking.createdAt)}</p>

      {booking.status === 'PENDING' && (
        <div className={cn('mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[16px] p-5', holdExpired ? 'bg-[#fff6f6]' : 'bg-brand-soft')}>
          <div>
            <p className="font-semibold">{holdExpired ? 'The payment window has expired' : 'Complete your payment to confirm this booking'}</p>
            <p className="text-sm text-muted">
              {holdExpired
                ? 'The dates are no longer held. Please book again.'
                : remaining !== null
                  ? `Your dates are held for ${formatRemaining(remaining)} more minutes.`
                  : 'Your dates are held for a short time.'}
            </p>
          </div>
          {!holdExpired && (
            <Button size="lg" onClick={() => void pay()} loading={busy} icon={<CreditCard className="size-5" aria-hidden />}>
              Pay now
            </Button>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="grid gap-5 rounded-[20px] bg-white p-5 shadow-card sm:grid-cols-[200px_1fr] md:p-6">
            {booking.camper ? (
              <Link to={ROUTES.camper(booking.camper.slug)}>
                <CamperImage src={coverImage(booking.camper)} alt={booking.camper.name} rounded={false} className="h-32 w-full" />
              </Link>
            ) : (
              <CamperImage src="" alt="" rounded={false} className="h-32 w-full" />
            )}
            <div className="space-y-2 text-sm">
              <h2 className="text-lg font-semibold">{booking.camper?.name ?? 'Camper no longer listed'}</h2>
              {booking.camper && (
                <p className="flex items-center gap-2"><MapPin className="size-4 text-brand" aria-hidden /> {camperLocation(booking.camper)}</p>
              )}
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4 text-brand" aria-hidden /> {formatDate(booking.startDate)} → {formatDate(booking.endDate)} · {booking.nights} night(s)
              </p>
              {settings && <p className="text-xs text-muted">Pickup from {settings.pickupTime} · return by {settings.returnTime}</p>}
            </div>
          </section>

          <section className="rounded-[20px] bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><User className="size-5 text-brand" aria-hidden /> Driver</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Name</dt><dd className="font-medium">{booking.driver.fullName}</dd></div>
              <div><dt className="text-muted">Phone</dt><dd className="font-medium">{booking.driver.phone}</dd></div>
              {booking.driver.licenseNumber && <div><dt className="text-muted">Licence</dt><dd className="font-medium">{booking.driver.licenseNumber}</dd></div>}
              {booking.customerNote && <div className="sm:col-span-2"><dt className="text-muted">Notes</dt><dd>{booking.customerNote}</dd></div>}
            </dl>
          </section>

          {booking.status === 'COMPLETED' && booking.camper && <ReviewForm booking={booking} />}

          <section className="rounded-[20px] bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold">History</h2>
            <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">
              {booking.statusHistory.map((entry) => (
                <li key={`${entry.status}-${entry.changedAt}`} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[27px] size-3 rounded-full bg-brand" aria-hidden />
                  <p className="font-medium">{BOOKING_STATUS_LABELS[entry.status]}</p>
                  <p className="text-xs text-muted">{formatDateTime(entry.changedAt)}{entry.reason ? ` · ${entry.reason}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-5 rounded-[20px] bg-white p-6 shadow-card lg:sticky lg:top-[118px]">
          <h2 className="text-lg font-semibold">Payment</h2>
          <PriceBreakdownList price={booking.price} />
          <p className="text-xs text-muted">Payment status: {booking.paymentStatus.replace('_', ' ').toLowerCase()}</p>
          {cancellable && (
            <div className="border-t border-line pt-4">
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelOpen(true)} disabled={busy}>
                Cancel booking
              </Button>
              {settings && booking.status === 'CONFIRMED' && (
                <p className="mt-1 text-xs text-muted">Paid bookings can be cancelled online up to {settings.freeCancellationDays} days before pickup.</p>
              )}
            </div>
          )}
          {booking.cancellationReason && <p className="text-xs text-muted">Reason: {booking.cancellationReason}</p>}
        </aside>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Cancel booking ${booking.bookingNumber}?`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep booking</Button>
            <Button variant="danger" onClick={() => void confirmCancel()} loading={busy}>Cancel booking</Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {booking.paymentStatus === 'PAID' ? 'Paid bookings are refunded according to our cancellation policy.' : 'The held dates will be released.'}
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor="cancel-reason">Reason <span className="font-normal text-muted">(optional)</span></label>
        <TextArea id="cancel-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5" />
      </Modal>
    </div>
  )
}

/** The customer's existing review, shown instead of the form (the backend allows one review per booking). */
function PostedReview({ review }: { review: OwnReview }) {
  return (
    <section className="rounded-[20px] bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold">Your review</h2>
      <div className="mt-3 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star key={value} className={cn('size-6', value <= review.rating ? 'fill-accent text-accent' : 'text-line')} aria-hidden />
        ))}
      </div>
      <p className="mt-3 text-sm whitespace-pre-line">{review.comment}</p>
      {review.status === 'HIDDEN' && <p className="mt-2 text-xs text-muted">This review is currently hidden by our team.</p>}
      {review.adminReply && (
        <div className="mt-4 rounded-xl bg-surface p-4 text-sm">
          <p className="font-semibold">Reply from FullCamper</p>
          <p className="mt-1 whitespace-pre-line">{review.adminReply}</p>
        </div>
      )}
    </section>
  )
}

/** POST /reviews — only allowed by the backend for COMPLETED bookings, once per booking. */
function ReviewForm({ booking }: { booking: Booking }) {
  const dispatch = useAppDispatch()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)
  // undefined while loading, null when the booking has not been reviewed yet.
  const [existing, setExisting] = useState<OwnReview | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    reviewApi
      .findForBooking(booking._id)
      .then((review) => active && setExisting(review))
      // If the lookup fails the form is still shown; the backend rejects a duplicate review anyway.
      .catch(() => active && setExisting(null))
    return () => {
      active = false
    }
  }, [booking._id])

  const submit = async () => {
    if (comment.trim().length < 3) {
      setError('Please write at least a few words.')
      return
    }
    setStatus('sending')
    setError(null)
    try {
      await reviewApi.create({ bookingId: booking._id, rating, comment: comment.trim() })
      setStatus('sent')
      dispatch(showToast('Thank you for your review!'))
    } catch (e) {
      setStatus('idle')
      setError(describeError(e))
    }
  }

  if (status === 'sent') {
    return <p className="rounded-[20px] bg-[#e8f5e9] p-6 text-sm font-medium text-success">Thanks! Your review has been published.</p>
  }
  if (existing === undefined) return <Skeleton className="h-40 w-full rounded-[20px]" />
  if (existing) return <PostedReview review={existing} />
  return (
    <section className="rounded-[20px] bg-white p-6 shadow-card">
      <h2 className="text-lg font-semibold">How was your trip?</h2>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} stars`} onClick={() => setRating(value)}>
            <Star className={cn('size-7 transition', value <= rating ? 'fill-accent text-accent' : 'text-line')} />
          </button>
        ))}
      </div>
      <TextArea rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell other travellers about the camper…" className="mt-3" aria-label="Your review" />
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
      <Button className="mt-4" onClick={() => void submit()} loading={status === 'sending'}>Publish review</Button>
    </section>
  )
}
