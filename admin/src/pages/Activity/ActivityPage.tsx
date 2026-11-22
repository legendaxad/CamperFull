import { AlertTriangle, CalendarSync, CreditCard, Undo2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Segmented } from '@/components/ui/Segmented'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { useActivityQuery } from '@/services/endpoints'
import type { ActivityItem, ActivityType } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatDateTime, formatMoney, formatRelative, fullName } from '@/utils/format'

const FILTERS: { value: 'ALL' | ActivityType; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'BOOKING_STATUS', label: 'Bookings' },
  { value: 'PAYMENT_CAPTURED', label: 'Payments' },
  { value: 'REFUND', label: 'Refunds' },
  { value: 'PAYMENT_FAILED', label: 'Failures' },
  { value: 'CUSTOMER_REGISTERED', label: 'Sign-ups' },
]

const ICONS: Record<ActivityType, { icon: typeof CreditCard; className: string }> = {
  BOOKING_STATUS: { icon: CalendarSync, className: 'bg-info-soft text-info' },
  PAYMENT_CAPTURED: { icon: CreditCard, className: 'bg-success-soft text-success' },
  PAYMENT_FAILED: { icon: AlertTriangle, className: 'bg-danger-soft text-danger' },
  REFUND: { icon: Undo2, className: 'bg-neutral-soft text-fg-2' },
  CUSTOMER_REGISTERED: { icon: UserPlus, className: 'bg-accent-soft text-accent-ink' },
}

const PAGE_SIZE = 25

function Actor({ item, currentAdminId }: { item: ActivityItem; currentAdminId: string }) {
  if (!item.actor) return <span className="font-medium text-fg">System</span>
  const name = item.actor._id === currentAdminId ? 'You' : fullName(item.actor)
  const role = item.actor.role === 'CUSTOMER' ? 'customer' : 'admin'
  return item.actor.role === 'CUSTOMER' ? (
    <Link to={`/customers/${item.actor._id}`} className="font-medium text-fg hover:underline">
      {name}
    </Link>
  ) : (
    <span className="font-medium text-fg" title={role}>
      {name}
      <span className="ml-1 rounded bg-muted px-1 py-px text-[10px] font-medium text-fg-3 uppercase">{role}</span>
    </span>
  )
}

function Describe({ item }: { item: ActivityItem }) {
  const booking = item.bookingId ? (
    <Link to={`/bookings/${item.bookingId}`} className="font-medium text-fg tabular hover:underline">
      {item.bookingNumber ?? 'booking'}
    </Link>
  ) : null
  const amount = item.amount !== undefined ? <strong className="font-medium text-fg tabular">{formatMoney(item.amount, item.currency)}</strong> : null
  switch (item.type) {
    case 'BOOKING_STATUS':
      return (
        <>
          {item.status === 'PENDING' ? 'created booking' : 'changed booking'} {booking} {item.status !== 'PENDING' && 'to'} {item.status && item.status !== 'PENDING' && <BookingStatusBadge status={item.status} />}
        </>
      )
    case 'PAYMENT_CAPTURED':
      return (
        <>
          paid {amount} for {booking}
        </>
      )
    case 'PAYMENT_FAILED':
      return (
        <>
          had a failed payment of {amount} for {booking}
        </>
      )
    case 'REFUND':
      return (
        <>
          refunded {amount} on {booking}
        </>
      )
    case 'CUSTOMER_REGISTERED':
      return <>registered a customer account</>
  }
}

export default function ActivityPage() {
  const admin = useCurrentAdmin()
  const [filter, setFilter] = useState<'ALL' | ActivityType>('ALL')
  const [pages, setPages] = useState(1)

  return (
    <>
      <PageHeader
        title="Activity log"
        description="Derived from booking status history, payments, refunds and registrations. Each entry shows who made the change and when."
        breadcrumbs={[{ label: 'Business' }, { label: 'Activity log' }]}
      />
      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto border-b border-line px-4 py-3">
          <Segmented label="Activity type" options={FILTERS} value={filter} onChange={(value) => (setFilter(value), setPages(1))} />
        </div>
        <ol className="divide-y divide-line">
          {Array.from({ length: pages }, (_, index) => (
            <ActivityPageChunk key={`${filter}-${index}`} page={index + 1} filter={filter} currentAdminId={admin._id} isLast={index === pages - 1} onMore={() => setPages((value) => value + 1)} />
          ))}
        </ol>
      </Card>
      <p className="mt-4 text-xs text-fg-3">
        Not recorded by the backend (so not shown): camper edits, settings changes, customer blocks and admin sign-ins. Adding an audit-log collection would make those visible.
      </p>
    </>
  )
}

/** One page of the feed; the last chunk renders the "Load more" control. */
function ActivityPageChunk({ page, filter, currentAdminId, isLast, onMore }: { page: number; filter: 'ALL' | ActivityType; currentAdminId: string; isLast: boolean; onMore: () => void }) {
  const { data, error, isLoading, isFetching, refetch } = useActivityQuery({ page, limit: PAGE_SIZE, type: filter === 'ALL' ? undefined : [filter] })

  if (isLoading) {
    return (
      <li className="flex flex-col gap-3 p-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </li>
    )
  }
  if (error) {
    return (
      <li>
        <ErrorState error={error} onRetry={refetch} compact />
      </li>
    )
  }
  if (page === 1 && data?.items.length === 0) {
    return (
      <li>
        <EmptyState title="No activity yet" description="Bookings, payments and registrations will show up here." />
      </li>
    )
  }

  return (
    <>
      {data?.items.map((item, index) => {
        const meta = ICONS[item.type]
        return (
          <li key={`${item.type}-${item.at}-${index}`} className="flex items-start gap-4 px-5 py-3.5">
            <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.className)}>
              <meta.icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-2">
                <Actor item={item} currentAdminId={currentAdminId} /> <Describe item={item} />
              </p>
              {item.reason && <p className="mt-1 text-xs text-fg-3">“{item.reason}”</p>}
            </div>
            <time dateTime={item.at} title={formatDateTime(item.at)} className="shrink-0 text-xs text-fg-3">
              {formatRelative(item.at)}
            </time>
          </li>
        )
      })}
      {isLast && data?.hasMore && (
        <li className="flex justify-center p-4">
          <Button size="sm" onClick={onMore} loading={isFetching}>
            Load more
          </Button>
        </li>
      )}
    </>
  )
}
