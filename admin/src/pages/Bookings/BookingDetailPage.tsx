import { CalendarCheck, CheckCircle2, CircleSlash, Flag, KeyRound, Mail, Phone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Thumb } from '@/components/ui/Avatar'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, DetailRow } from '@/components/ui/Card'
import { ConfirmDialog, type ConfirmResult } from '@/components/ui/ConfirmDialog'
import { Textarea } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toastContext'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { describeError } from '@/services/errors'
import { useBookingQuery, usePaymentsQuery, useUpdateBookingNoteMutation, useUpdateBookingStatusMutation } from '@/services/endpoints'
import type { Booking, BookingStatus } from '@/types/api'
import { todayInKorea } from '@/utils/dates'
import { formatDate, formatDateTime, formatMoney, fullName, pluralize } from '@/utils/format'
import { BOOKING_ACTION_LABELS, BOOKING_STATUS_META, BOOKING_TRANSITIONS } from '@/utils/status'

const ACTION_ICONS: Partial<Record<BookingStatus, typeof CheckCircle2>> = {
  CONFIRMED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: CircleSlash,
  ACTIVE: KeyRound,
  COMPLETED: Flag,
}

function dialogFor(target: BookingStatus, booking: Booking) {
  const paid = booking.paymentStatus === 'PAID' || booking.paymentStatus === 'PARTIALLY_REFUNDED'
  switch (target) {
    case 'CONFIRMED':
      return {
        title: 'Confirm this booking?',
        description: paid
          ? 'The payment has been captured. Availability is re-checked before confirming.'
          : 'No online payment has been captured. Confirm only if the customer paid another way. Availability is re-checked before confirming.',
        confirmLabel: 'Confirm booking',
        tone: 'primary' as const,
        reason: { label: 'Note (optional)', placeholder: 'e.g. Paid by bank transfer' },
      }
    case 'REJECTED':
      return {
        title: 'Reject this booking?',
        description: 'The dates are released and the customer is notified. This cannot be undone.',
        confirmLabel: 'Reject booking',
        tone: 'danger' as const,
        reason: { label: 'Reason shown to the customer', required: true, placeholder: 'e.g. Vehicle unavailable for these dates' },
      }
    case 'CANCELLED':
      return {
        title: 'Cancel this booking?',
        description: 'The dates are released and the customer is notified. This cannot be undone.',
        confirmLabel: 'Cancel booking',
        tone: 'danger' as const,
        reason: { label: 'Reason', placeholder: 'e.g. Customer request by phone' },
        option: paid
          ? { label: 'Refund the paid amount', description: 'Refunds the remaining captured amount through the payment provider before cancelling.', defaultChecked: true }
          : undefined,
      }
    case 'ACTIVE':
      return { title: 'Mark as picked up?', description: 'The rental becomes active.', confirmLabel: 'Mark picked up', tone: 'primary' as const }
    case 'COMPLETED':
      return { title: 'Mark as returned?', description: 'The rental is completed and the customer can leave a review.', confirmLabel: 'Mark returned', tone: 'primary' as const }
    default:
      return { title: 'Change status?', confirmLabel: 'Confirm', tone: 'primary' as const }
  }
}

export default function BookingDetailPage() {
  const { id = '' } = useParams()
  const { data: booking, error, isLoading, refetch } = useBookingQuery(id)

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-10 w-64 lg:col-span-3" />
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    )
  }
  if (error || !booking) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }
  return <BookingDetail booking={booking} />
}

function BookingDetail({ booking }: { booking: Booking }) {
  const admin = useCurrentAdmin()
  const toast = useToast()
  const [target, setTarget] = useState<BookingStatus | null>(null)
  const [updateStatus, { isLoading: updating }] = useUpdateBookingStatusMutation()
  const payments = usePaymentsQuery({ page: 1, limit: 10, bookingId: booking._id })
  const today = todayInKorea()
  const transitions = BOOKING_TRANSITIONS[booking.status]
  const dialog = target ? dialogFor(target, booking) : null

  const apply = async (result: ConfirmResult) => {
    if (!target) return
    try {
      await updateStatus({ id: booking._id, status: target, reason: result.reason, refund: target === 'CANCELLED' ? result.checked : undefined }).unwrap()
      toast.success(`Booking ${booking.bookingNumber} is now ${BOOKING_STATUS_META[target].label.toLowerCase()}.`)
      setTarget(null)
    } catch (err) {
      toast.error(describeError(err))
    }
  }

  const actorLabel = (changedBy?: string) => {
    if (!changedBy) return 'System'
    if (changedBy === admin._id) return 'You'
    if (changedBy === booking.customer?._id) return 'Customer'
    return 'Administrator'
  }

  return (
    <>
      <PageHeader
        documentTitle={`Booking ${booking.bookingNumber}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{booking.bookingNumber}</span>
            <BookingStatusBadge status={booking.status} />
          </span>
        }
        description={`Created ${formatDateTime(booking.createdAt)}`}
        breadcrumbs={[{ label: 'Bookings', to: '/bookings' }, { label: booking.bookingNumber }]}
        actions={transitions.map((status) => {
          const Icon = ACTION_ICONS[status]
          const notYet = status === 'ACTIVE' && today < booking.startDate.slice(0, 10)
          const destructive = status === 'CANCELLED' || status === 'REJECTED'
          return (
            <Button
              key={status}
              variant={destructive ? 'secondary' : status === transitions[0] ? 'primary' : 'secondary'}
              className={destructive ? 'text-danger hover:border-danger/40' : undefined}
              icon={Icon && <Icon className="h-4 w-4" />}
              disabled={notYet}
              title={notYet ? `Available from the pickup day (${formatDate(booking.startDate)})` : undefined}
              onClick={() => setTarget(status)}
            >
              {BOOKING_ACTION_LABELS[status]}
            </Button>
          )
        })}
      />

      {booking.status === 'PENDING' && booking.holdExpiresAt && (
        <div className="mb-6 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px] text-warning">
          Awaiting payment. The dates are held until <strong>{formatDateTime(booking.holdExpiresAt)}</strong>; after that the booking is cancelled automatically.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Stay" />
            <div className="flex flex-col gap-5 px-5 pb-5 sm:flex-row">
              <Thumb src={booking.camper?.images[0]?.url} alt={booking.camper?.name ?? ''} className="h-28 w-full sm:w-44" />
              <div className="min-w-0 flex-1">
                {booking.camper ? (
                  <Link to={`/campers/${booking.camper._id}`} className="text-base font-semibold text-fg hover:underline">
                    {booking.camper.name}
                  </Link>
                ) : (
                  <p className="text-base font-semibold text-fg-3">Camper removed</p>
                )}
                <p className="text-[13px] text-fg-3">{[booking.camper?.location.city, booking.camper?.location.region].filter(Boolean).join(', ')}</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-subtle p-3">
                    <p className="text-xs text-fg-3">Pickup</p>
                    <p className="mt-0.5 font-medium text-fg tabular">{formatDate(booking.startDate)}</p>
                  </div>
                  <div className="rounded-lg bg-subtle p-3">
                    <p className="text-xs text-fg-3">Return</p>
                    <p className="mt-0.5 font-medium text-fg tabular">{formatDate(booking.endDate)}</p>
                  </div>
                  <div className="rounded-lg bg-subtle p-3">
                    <p className="text-xs text-fg-3">Length</p>
                    <p className="mt-0.5 font-medium text-fg">{pluralize(booking.nights, 'night')}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Price breakdown" description="Frozen at booking time" />
            <dl className="divide-y divide-line px-5 pb-3">
              <DetailRow label={`${pluralize(booking.price.weekdayNights, 'weekday night')} × ${formatMoney(booking.price.dailyRate)}`}>
                {formatMoney(booking.price.weekdayNights * booking.price.dailyRate)}
              </DetailRow>
              {booking.price.weekendNights > 0 && (
                <DetailRow label={`${pluralize(booking.price.weekendNights, 'weekend night')} × ${formatMoney(booking.price.weekendDailyRate)}`}>
                  {formatMoney(booking.price.weekendNights * booking.price.weekendDailyRate)}
                </DetailRow>
              )}
              <DetailRow label="Cleaning fee">{formatMoney(booking.price.cleaningFee)}</DetailRow>
              {booking.price.extras.map((extra) => (
                <DetailRow key={extra.extraId} label={`${extra.name} × ${extra.quantity}${extra.chargeType === 'PER_NIGHT' ? ' (per night)' : ''}`}>
                  {formatMoney(extra.total)}
                </DetailRow>
              ))}
              {booking.price.discount > 0 && (
                <DetailRow label={`Discount${booking.price.couponCode ? ` (${booking.price.couponCode})` : ''}`}>
                  <span className="text-success">−{formatMoney(booking.price.discount)}</span>
                </DetailRow>
              )}
              <DetailRow label={<span className="font-semibold text-fg">Total</span>}>
                <span className="text-base">{formatMoney(booking.price.total, booking.price.currency)}</span>
              </DetailRow>
              <DetailRow label="Security deposit (collected at pickup)">{formatMoney(booking.price.securityDeposit)}</DetailRow>
            </dl>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Payments" action={<PaymentStatusBadge status={booking.paymentStatus} />} />
            {payments.isLoading ? (
              <Skeleton className="mx-5 mb-5 h-12" />
            ) : payments.error ? (
              <ErrorState error={payments.error} onRetry={payments.refetch} compact />
            ) : payments.data?.items.length === 0 ? (
              <EmptyState compact title="No payment attempts" description="The customer has not started checkout for this booking." />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {payments.data?.items.map((payment) => (
                  <li key={payment._id}>
                    <Link to={`/payments/${payment._id}`} className="flex items-center gap-4 px-5 py-3 text-[13px] transition-colors hover:bg-subtle">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-fg tabular">{payment.orderId}</span>
                        <span className="block text-xs text-fg-3">
                          {payment.method ?? payment.provider} · {formatDateTime(payment.paidAt ?? payment.createdAt)}
                        </span>
                      </span>
                      <span className="text-right tabular">
                        <span className="block font-medium text-fg">{formatMoney(payment.amount, payment.currency)}</span>
                        {payment.refundedAmount > 0 && <span className="block text-xs text-fg-3">−{formatMoney(payment.refundedAmount)} refunded</span>}
                      </span>
                      <PaymentStatusBadge status={payment.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="History" description="Every status change, newest first" />
            <ol className="relative px-5 pb-5">
              {[...booking.statusHistory].reverse().map((entry, index) => (
                <li key={`${entry.changedAt}-${index}`} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className="relative flex flex-col items-center">
                    <span className={index === 0 ? 'mt-1 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-accent-soft' : 'mt-1 h-2.5 w-2.5 rounded-full bg-line-strong'} />
                    {index < booking.statusHistory.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookingStatusBadge status={entry.status} />
                      <span className="text-xs text-fg-3">
                        {formatDateTime(entry.changedAt)} · {actorLabel(entry.changedBy)}
                      </span>
                    </div>
                    {entry.reason && <p className="mt-1.5 text-[13px] text-fg-2">“{entry.reason}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Customer" />
            <div className="px-5 pb-5">
              {booking.customer ? (
                <>
                  <Link to={`/customers/${booking.customer._id}`} className="font-semibold text-fg hover:underline">
                    {fullName(booking.customer)}
                  </Link>
                  <a href={`mailto:${booking.customer.email}`} className="mt-2 flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg">
                    <Mail className="h-3.5 w-3.5 text-fg-3" /> {booking.customer.email}
                  </a>
                  {booking.customer.phone && (
                    <a href={`tel:${booking.customer.phone}`} className="mt-1.5 flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg">
                      <Phone className="h-3.5 w-3.5 text-fg-3" /> {booking.customer.phone}
                    </a>
                  )}
                  <Link to={`/bookings?customerId=${booking.customer._id}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline">
                    <CalendarCheck className="h-3.5 w-3.5" /> All bookings by this customer
                  </Link>
                </>
              ) : (
                <p className="text-[13px] text-fg-3">The customer account no longer exists.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Driver" />
            <dl className="divide-y divide-line px-5 pb-3">
              <DetailRow label="Name">{booking.driver.fullName}</DetailRow>
              <DetailRow label="Phone">{booking.driver.phone}</DetailRow>
              <DetailRow label="Licence no.">{booking.driver.licenseNumber || '—'}</DetailRow>
            </dl>
          </Card>

          {(booking.customerNote || booking.cancellationReason) && (
            <Card>
              <CardHeader title="Notes from the booking" />
              <div className="flex flex-col gap-3 px-5 pb-5 text-[13px]">
                {booking.customerNote && (
                  <div>
                    <p className="text-xs text-fg-3">Customer note</p>
                    <p className="mt-1 whitespace-pre-line text-fg-2">{booking.customerNote}</p>
                  </div>
                )}
                {booking.cancellationReason && (
                  <div>
                    <p className="text-xs text-fg-3">{booking.status === 'REJECTED' ? 'Rejection reason' : 'Cancellation reason'}</p>
                    <p className="mt-1 text-fg-2">{booking.cancellationReason}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <AdminNote booking={booking} />
        </div>
      </div>

      {dialog && (
        <ConfirmDialog
          open={Boolean(target)}
          busy={updating}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          tone={dialog.tone}
          reason={'reason' in dialog ? dialog.reason : undefined}
          option={'option' in dialog ? dialog.option : undefined}
          onCancel={() => setTarget(null)}
          onConfirm={apply}
        />
      )}
    </>
  )
}

function AdminNote({ booking }: { booking: Booking }) {
  const toast = useToast()
  const [note, setNote] = useState(booking.adminNote ?? '')
  const [save, { isLoading }] = useUpdateBookingNoteMutation()
  const dirty = note.trim() !== (booking.adminNote ?? '').trim()

  return (
    <Card>
      <CardHeader title="Internal note" description="Visible to administrators only" />
      <form
        className="flex flex-col gap-3 px-5 pb-5"
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            await save({ id: booking._id, adminNote: note.trim() }).unwrap()
            toast.success('Note saved.')
          } catch (err) {
            toast.error(describeError(err))
          }
        }}
      >
        <Textarea aria-label="Internal note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4} placeholder="Add context for the team…" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-3 tabular">{note.length}/2000</span>
          <Button type="submit" size="sm" variant="primary" disabled={!dirty} loading={isLoading}>
            Save note
          </Button>
        </div>
      </form>
    </Card>
  )
}
