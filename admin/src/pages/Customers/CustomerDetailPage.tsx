import { Ban, CalendarCheck, Mail, Phone, Repeat2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, BookingStatusBadge, MemberStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, DetailRow } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/toastContext'
import { describeError } from '@/services/errors'
import { useBookingsQuery, useCustomerQuery, usePaymentsQuery, useSetCustomerStatusMutation } from '@/services/endpoints'
import type { Booking, CustomerDetail, Payment } from '@/types/api'
import { formatDate, formatDateTime, formatMoney, formatNumber, fullName, pluralize } from '@/utils/format'

export default function CustomerDetailPage() {
  const { id = '' } = useParams()
  const { data, error, isLoading, refetch } = useCustomerQuery(id)
  if (isLoading) return <Skeleton className="h-[60vh]" />
  if (error || !data) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }
  return <CustomerProfile detail={data} />
}

const bookingColumns: Column<Booking>[] = [
  {
    key: 'number',
    header: 'Booking',
    cell: (booking) => (
      <Link to={`/bookings/${booking._id}`} className="font-medium text-fg tabular hover:underline">
        {booking.bookingNumber}
      </Link>
    ),
  },
  { key: 'camper', header: 'Camper', cell: (booking) => <span className="text-fg-2">{booking.camper?.name ?? 'Removed camper'}</span> },
  {
    key: 'dates',
    header: 'Dates',
    hideBelow: 'md',
    cell: (booking) => (
      <span className="whitespace-nowrap text-fg-2 tabular">
        {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
      </span>
    ),
  },
  { key: 'total', header: 'Total', align: 'right', cell: (booking) => formatMoney(booking.price.total) },
  { key: 'status', header: 'Status', cell: (booking) => <BookingStatusBadge status={booking.status} /> },
]

const paymentColumns: Column<Payment>[] = [
  {
    key: 'order',
    header: 'Order',
    cell: (payment) => (
      <Link to={`/payments/${payment._id}`} className="font-medium text-fg tabular hover:underline">
        {payment.orderId}
      </Link>
    ),
  },
  { key: 'date', header: 'Date', cell: (payment) => <span className="text-fg-2">{formatDateTime(payment.paidAt ?? payment.createdAt)}</span> },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    cell: (payment) => (
      <span>
        {formatMoney(payment.amount, payment.currency)}
        {payment.refundedAmount > 0 && <span className="block text-xs text-fg-3">−{formatMoney(payment.refundedAmount)}</span>}
      </span>
    ),
  },
  { key: 'status', header: 'Status', cell: (payment) => <PaymentStatusBadge status={payment.status} /> },
]

function CustomerProfile({ detail }: { detail: CustomerDetail }) {
  const { customer, stats } = detail
  const toast = useToast()
  const [bookingPage, setBookingPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [setStatus, { isLoading: changing }] = useSetCustomerStatusMutation()
  const bookings = useBookingsQuery({ page: bookingPage, limit: 6, customerId: customer._id })
  const confirmedBookings = useBookingsQuery({ page: 1, limit: 1, customerId: customer._id, status: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] })
  const payments = usePaymentsQuery({ page: paymentPage, limit: 6, customerId: customer._id })
  const blocked = customer.status === 'BLOCKED'
  const returning = (confirmedBookings.data?.meta.total ?? 0) >= 2
  const name = fullName(customer)

  return (
    <>
      <PageHeader
        documentTitle={name}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {name}
            <MemberStatusBadge status={customer.status} />
            {returning && (
              <Badge tone="accent" dot={false}>
                <Repeat2 className="h-3 w-3" /> Returning customer
              </Badge>
            )}
          </span>
        }
        description={`Customer since ${formatDate(customer.createdAt)}`}
        breadcrumbs={[{ label: 'Customers', to: '/customers' }, { label: name }]}
        actions={
          customer.status !== 'DELETED' && (
            <Button
              variant="secondary"
              className={blocked ? undefined : 'text-danger'}
              icon={blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              onClick={() => setConfirming(true)}
            >
              {blocked ? 'Unblock' : 'Block customer'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
              <Avatar name={name} src={customer.avatar?.url} size="lg" />
              <p className="mt-3 text-base font-semibold text-fg">{name}</p>
              <a href={`mailto:${customer.email}`} className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg">
                <Mail className="h-3.5 w-3.5 text-fg-3" /> {customer.email}
              </a>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-2 hover:text-fg">
                  <Phone className="h-3.5 w-3.5 text-fg-3" /> {customer.phone}
                </a>
              )}
            </div>
            <dl className="divide-y divide-line border-t border-line px-5 pb-2">
              <DetailRow label="Registered">{formatDateTime(customer.createdAt)}</DetailRow>
              <DetailRow label="Last sign-in">{customer.lastLoginAt ? formatDateTime(customer.lastLoginAt) : 'Never'}</DetailRow>
              <DetailRow label="Last booking">{stats.lastBookingAt ? formatDate(stats.lastBookingAt) : '—'}</DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Lifetime value" />
            <div className="grid grid-cols-2 gap-4 px-5 pb-5">
              <div className="col-span-2 rounded-xl bg-accent-soft/60 p-4">
                <p className="text-xs text-fg-3">Total spent (net of refunds)</p>
                <p className="mt-1 text-2xl font-semibold text-fg tabular">{formatMoney(stats.totalSpent)}</p>
                <p className="mt-1 text-[11px] text-fg-3">From captured payments only</p>
              </div>
              <div>
                <p className="text-xs text-fg-3">Bookings</p>
                <p className="mt-1 text-lg font-semibold text-fg tabular">{formatNumber(stats.totalBookings)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-3">Completed</p>
                <p className="mt-1 text-lg font-semibold text-fg tabular">{formatNumber(stats.completedBookings)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-3">Cancelled</p>
                <p className="mt-1 text-lg font-semibold text-fg tabular">{formatNumber(stats.cancelledBookings)}</p>
              </div>
              <div>
                <p className="text-xs text-fg-3">Confirmed or better</p>
                <p className="mt-1 text-lg font-semibold text-fg tabular">{confirmedBookings.data ? formatNumber(confirmedBookings.data.meta.total) : '…'}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader
              title="Bookings"
              description={bookings.data ? pluralize(bookings.data.meta.total, 'booking') : undefined}
              action={
                <Link to={`/bookings?customerId=${customer._id}`} className="flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline">
                  <CalendarCheck className="h-3.5 w-3.5" /> Open in bookings
                </Link>
              }
            />
            <DataTable
              caption="Customer bookings"
              columns={bookingColumns}
              rows={bookings.data?.items}
              rowKey={(booking) => booking._id}
              rowHref={(booking) => `/bookings/${booking._id}`}
              loading={bookings.isLoading}
              fetching={bookings.isFetching}
              error={bookings.error}
              onRetry={bookings.refetch}
              skeletonRows={3}
              empty={<EmptyState compact title="No bookings yet" />}
            />
            <Pagination meta={bookings.data?.meta} onPageChange={setBookingPage} label="bookings" />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Payments" description={payments.data ? pluralize(payments.data.meta.total, 'payment attempt') : undefined} />
            <DataTable
              caption="Customer payments"
              columns={paymentColumns}
              rows={payments.data?.items}
              rowKey={(payment) => payment._id}
              rowHref={(payment) => `/payments/${payment._id}`}
              loading={payments.isLoading}
              fetching={payments.isFetching}
              error={payments.error}
              onRetry={payments.refetch}
              skeletonRows={3}
              empty={<EmptyState compact title="No payments yet" />}
            />
            <Pagination meta={payments.data?.meta} onPageChange={setPaymentPage} label="payments" />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        busy={changing}
        tone={blocked ? 'primary' : 'danger'}
        title={blocked ? `Unblock ${name}?` : `Block ${name}?`}
        description={blocked ? 'They will be able to sign in and book again.' : 'They are signed out everywhere immediately and cannot sign in. Existing bookings are not changed.'}
        confirmLabel={blocked ? 'Unblock' : 'Block customer'}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          try {
            await setStatus({ id: customer._id, status: blocked ? 'ACTIVE' : 'BLOCKED' }).unwrap()
            toast.success(blocked ? `${name} was unblocked.` : `${name} was blocked.`)
            setConfirming(false)
          } catch (error) {
            toast.error(describeError(error))
          }
        }}
      />
    </>
  )
}
