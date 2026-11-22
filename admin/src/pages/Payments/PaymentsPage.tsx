import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DateRangeControl } from '@/components/dashboard/DateRangeControl'
import { PageHeader } from '@/components/layout/PageHeader'
import { PaymentStatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { SearchInput } from '@/components/ui/Field'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Segmented'
import { useDebouncedValue } from '@/hooks/common'
import { useDateRange } from '@/hooks/useDateRange'
import { useListParams } from '@/hooks/useListParams'
import { usePaymentSummaryQuery, usePaymentsQuery } from '@/services/endpoints'
import { PAYMENT_STATUSES, type Payment, type PaymentStatus } from '@/types/api'
import { addDays } from '@/utils/dates'
import { formatDateTime, formatMoney, fullName, pluralize } from '@/utils/format'
import { PAYMENT_STATUS_META } from '@/utils/status'

const columns: Column<Payment>[] = [
  {
    key: 'order',
    header: 'Order',
    cell: (payment) => (
      <div>
        <Link to={`/payments/${payment._id}`} className="font-medium text-fg tabular hover:underline">
          {payment.orderId}
        </Link>
        <p className="text-xs text-fg-3">{payment.method ?? payment.provider}</p>
      </div>
    ),
  },
  {
    key: 'booking',
    header: 'Booking',
    hideBelow: 'md',
    cell: (payment) =>
      payment.booking ? (
        <Link to={`/bookings/${payment.booking._id}`} className="text-fg-2 tabular hover:underline">
          {payment.booking.bookingNumber}
        </Link>
      ) : (
        '—'
      ),
  },
  { key: 'customer', header: 'Customer', hideBelow: 'lg', cell: (payment) => <span className="text-fg-2">{fullName(payment.customer)}</span> },
  { key: 'date', header: 'Date', cell: (payment) => <span className="whitespace-nowrap text-fg-2">{formatDateTime(payment.paidAt ?? payment.createdAt)}</span> },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    cell: (payment) => (
      <span>
        <span className="font-medium text-fg">{formatMoney(payment.amount, payment.currency)}</span>
        {payment.refundedAmount > 0 && <span className="block text-xs text-fg-3">−{formatMoney(payment.refundedAmount)} refunded</span>}
      </span>
    ),
  },
  { key: 'status', header: 'Status', cell: (payment) => <PaymentStatusBadge status={payment.status} /> },
]

function Summary({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] font-medium text-fg-2">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight tabular ${tone ?? 'text-fg'}`}>{value}</p>
      <p className="mt-1 text-xs text-fg-3">{sub}</p>
    </div>
  )
}

export default function PaymentsPage() {
  const range = useDateRange('30d')
  const list = useListParams()
  const [search, setSearch] = useState(list.get('search'))
  const debounced = useDebouncedValue(search.trim())
  const status = list.get('status') as PaymentStatus | ''
  const validStatus = (PAYMENT_STATUSES as readonly string[]).includes(status) ? (status as PaymentStatus) : null

  useEffect(() => {
    if (debounced !== list.get('search')) list.set({ search: debounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const summary = usePaymentSummaryQuery({ from: range.from, to: range.to })
  const { data, error, isLoading, isFetching, refetch } = usePaymentsQuery({
    page: list.page,
    limit: 20,
    status: validStatus ? [validStatus] : undefined,
    search: list.get('search') || undefined,
    from: range.from,
    to: addDays(range.to, 1),
  })
  const s = summary.data

  return (
    <>
      <PageHeader
        title="Payments"
        description="Captured payments, refunds and failed attempts. Card details are handled by the payment provider and never stored here."
        breadcrumbs={[{ label: 'Management' }, { label: 'Payments' }]}
        actions={<DateRangeControl range={range} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {s ? (
          <>
            <Summary label="Net revenue" value={formatMoney(s.captured.net)} sub={`${formatMoney(s.captured.gross)} captured − ${formatMoney(s.captured.refunded)} refunded`} />
            <Summary label="Refunds issued" value={formatMoney(s.refundsIssued.amount)} sub={`${pluralize(s.refundsIssued.count, 'refund')} processed in this period`} />
            <Summary label="Pending" value={formatMoney(s.byStatus.PENDING.amount)} sub={`${pluralize(s.byStatus.PENDING.count, 'checkout')} started, not captured`} tone="text-warning" />
            <Summary label="Failed" value={formatMoney(s.byStatus.FAILED.amount)} sub={`${pluralize(s.byStatus.FAILED.count, 'attempt')} declined or failed`} tone={s.byStatus.FAILED.count ? 'text-danger' : undefined} />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[118px] rounded-[var(--radius-card)]" />)
        )}
      </div>

      {s && s.methods.length > 0 && (
        <Card className="mb-6 px-5 py-4">
          <p className="mb-3 text-[13px] font-medium text-fg-2">Payment methods (captured in period, net)</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {s.methods.map((method) => (
              <div key={method.method}>
                <p className="text-xs text-fg-3">{method.method}</p>
                <p className="text-sm font-semibold text-fg tabular">
                  {formatMoney(method.amount)} <span className="text-xs font-normal text-fg-3">· {pluralize(method.count, 'payment')}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-line px-3">
          <Tabs
            label="Payment status"
            value={validStatus ?? 'ALL'}
            onChange={(value) => list.set({ status: value === 'ALL' ? null : value })}
            tabs={[
              { value: 'ALL', label: 'All' },
              ...PAYMENT_STATUSES.map((value) => ({ value, label: PAYMENT_STATUS_META[value].label, count: s?.byStatus[value].count })),
            ]}
          />
        </div>
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Order ID or transaction ID…" className="sm:w-80" label="Search payments" />
          <p className="text-xs text-fg-3 sm:ml-auto">Payment attempts created in the selected period</p>
        </div>
        <DataTable
          caption="Payments"
          columns={columns}
          rows={data?.items}
          rowKey={(payment) => payment._id}
          rowHref={(payment) => `/payments/${payment._id}`}
          loading={isLoading}
          fetching={isFetching}
          error={error}
          onRetry={refetch}
          empty={<EmptyState title="No payments in this period" description="Payments appear when customers check out a booking." />}
        />
        <Pagination meta={data?.meta} onPageChange={list.setPage} label="payments" />
      </Card>
    </>
  )
}
