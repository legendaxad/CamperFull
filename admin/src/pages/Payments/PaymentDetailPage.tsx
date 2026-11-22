import { ExternalLink, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, DetailRow } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toastContext'
import { describeError, fieldErrorMap } from '@/services/errors'
import { usePaymentQuery, useRefundPaymentMutation } from '@/services/endpoints'
import type { Payment } from '@/types/api'
import { formatDate, formatDateTime, formatMoney, fullName } from '@/utils/format'

export default function PaymentDetailPage() {
  const { id = '' } = useParams()
  const { data, error, isLoading, refetch } = usePaymentQuery(id)
  if (isLoading) return <Skeleton className="h-[60vh]" />
  if (error || !data) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }
  return <PaymentDetail payment={data} />
}

function PaymentDetail({ payment }: { payment: Payment }) {
  const [refunding, setRefunding] = useState(false)
  const refundable = payment.amount - payment.refundedAmount
  const canRefund = (payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED') && refundable > 0 && Boolean(payment.transactionId)
  const net = payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED' || payment.status === 'REFUNDED' ? refundable : 0

  return (
    <>
      <PageHeader
        documentTitle={`Payment ${payment.orderId}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="tabular">{formatMoney(payment.amount, payment.currency)}</span>
            <PaymentStatusBadge status={payment.status} />
          </span>
        }
        description={`Order ${payment.orderId}`}
        breadcrumbs={[{ label: 'Payments', to: '/payments' }, { label: payment.orderId }]}
        actions={
          canRefund && (
            <Button variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => setRefunding(true)}>
              Refund
            </Button>
          )
        }
      />

      {payment.failureReason && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger" role="status">
          {payment.failureReason}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Amounts" />
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-3">
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-fg-3">Charged</p>
                <p className="mt-1 text-xl font-semibold text-fg tabular">{payment.status === 'PENDING' || payment.status === 'FAILED' ? '—' : formatMoney(payment.amount)}</p>
              </div>
              <div className="rounded-xl bg-subtle p-4">
                <p className="text-xs text-fg-3">Refunded</p>
                <p className="mt-1 text-xl font-semibold text-fg tabular">{formatMoney(payment.refundedAmount)}</p>
              </div>
              <div className="rounded-xl bg-accent-soft/60 p-4">
                <p className="text-xs text-fg-3">Net revenue</p>
                <p className="mt-1 text-xl font-semibold text-fg tabular">{formatMoney(net)}</p>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Refunds" />
            {!payment.refunds || payment.refunds.length === 0 ? (
              <EmptyState compact title="No refunds" />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {payment.refunds.map((refund) => (
                  <li key={refund._id} className="flex items-start gap-4 px-5 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{refund.reason}</p>
                      <p className="mt-0.5 text-xs text-fg-3">
                        {formatDateTime(refund.refundedAt)} · {typeof refund.processedBy === 'object' && refund.processedBy ? fullName(refund.processedBy) : 'Automatic'}
                      </p>
                    </div>
                    <span className="font-medium text-fg tabular">−{formatMoney(refund.amount, payment.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Transaction" />
            <dl className="divide-y divide-line px-5 pb-3">
              <DetailRow label="Provider">{payment.provider === 'MOCK' ? 'Mock (development)' : 'Toss Payments'}</DetailRow>
              <DetailRow label="Method">{payment.method ?? '—'}</DetailRow>
              <DetailRow label="Transaction ID">
                <span className="text-xs tabular">{payment.transactionId ?? '—'}</span>
              </DetailRow>
              <DetailRow label="Created">{formatDateTime(payment.createdAt)}</DetailRow>
              <DetailRow label="Captured">{payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</DetailRow>
            </dl>
            {payment.receiptUrl && /^https:\/\//.test(payment.receiptUrl) && (
              <div className="border-t border-line px-5 py-3">
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline">
                  Provider receipt <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Booking" />
            <div className="px-5 pb-5 text-[13px]">
              {payment.booking ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/bookings/${payment.booking._id}`} className="font-semibold text-fg tabular hover:underline">
                      {payment.booking.bookingNumber}
                    </Link>
                    <BookingStatusBadge status={payment.booking.status} />
                  </div>
                  <p className="mt-1 text-fg-3">
                    {formatDate(payment.booking.startDate)} → {formatDate(payment.booking.endDate)}
                  </p>
                  {payment.booking.price && <p className="mt-1 text-fg-3">Booking value {formatMoney(payment.booking.price.total)}</p>}
                </>
              ) : (
                <p className="text-fg-3">The booking no longer exists.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Customer" />
            <div className="px-5 pb-5 text-[13px]">
              {payment.customer ? (
                <>
                  <Link to={`/customers/${payment.customer._id}`} className="font-semibold text-fg hover:underline">
                    {fullName(payment.customer)}
                  </Link>
                  <p className="mt-1 text-fg-3">{payment.customer.email}</p>
                  {payment.customer.phone && <p className="text-fg-3">{payment.customer.phone}</p>}
                </>
              ) : (
                <p className="text-fg-3">The customer account no longer exists.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <RefundDialog key={refundable} payment={payment} refundable={refundable} open={refunding} onClose={() => setRefunding(false)} />
    </>
  )
}

function RefundDialog({ payment, refundable, open, onClose }: { payment: Payment; refundable: number; open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [amount, setAmount] = useState(String(refundable))
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const [refund, { isLoading, error }] = useRefundPaymentMutation()
  const serverFields = fieldErrorMap(error)

  const parsed = Number(amount)
  const amountError = !/^\d+$/.test(amount.trim()) ? 'Enter a whole amount in KRW.' : parsed < 1 || parsed > refundable ? `Enter between ₩1 and ${formatMoney(refundable)}.` : serverFields.amount
  const reasonError = reason.trim().length < 3 ? 'Give a reason (at least 3 characters).' : serverFields.reason

  const submit = async () => {
    setTouched(true)
    if (amountError || reasonError) return
    try {
      await refund({ id: payment._id, amount: parsed, reason: reason.trim() }).unwrap()
      toast.success(`${formatMoney(parsed)} refunded.`)
      onClose()
    } catch (err) {
      toast.error(describeError(err))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={isLoading}
      size="sm"
      title="Refund payment"
      description="The refund is sent to the payment provider immediately and cannot be reversed."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" loading={isLoading} onClick={() => void submit()}>
            Refund {/^\d+$/.test(amount) && parsed > 0 ? formatMoney(parsed) : ''}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <p className="rounded-lg bg-subtle px-3 py-2 text-[13px] text-fg-2">
          Refundable: <strong className="text-fg tabular">{formatMoney(refundable, payment.currency)}</strong> of {formatMoney(payment.amount, payment.currency)}
        </p>
        <Field label="Amount (KRW)" required error={touched ? amountError : undefined}>
          {(id, describedBy) => <Input id={id} aria-describedby={describedBy} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} data-autofocus invalid={touched && Boolean(amountError)} />}
        </Field>
        <Field label="Reason" required error={touched ? reasonError : undefined}>
          {(id, describedBy) => <Textarea id={id} aria-describedby={describedBy} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} invalid={touched && Boolean(reasonError)} />}
        </Field>
        <button type="submit" className="hidden" tabIndex={-1}>Submit</button>
      </form>
    </Modal>
  )
}
