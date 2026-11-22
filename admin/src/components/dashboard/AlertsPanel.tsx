import { AlertOctagon, CalendarClock, CheckCircle2, ChevronRight, Clock, MessageSquare, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { KpiSnapshot } from '@/types/api'
import { cn } from '@/utils/cn'
import { pluralize } from '@/utils/format'
import { todayInKorea, addDays } from '@/utils/dates'

interface Alert {
  key: string
  tone: 'danger' | 'warning' | 'info'
  icon: typeof Clock
  title: string
  detail: string
  to?: string
}

const TONES = {
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
}

/** Operational alerts computed from live booking/fleet state (never shown when the count is zero). */
export function AlertsPanel({ snapshot }: { snapshot: KpiSnapshot }) {
  const today = todayInKorea()
  const week = addDays(today, 6)
  const alerts: Alert[] = []

  if (snapshot.overdueReturns > 0)
    alerts.push({
      key: 'overdue-returns',
      tone: 'danger',
      icon: AlertOctagon,
      title: `${pluralize(snapshot.overdueReturns, 'rental')} past return date`,
      detail: 'Still marked active after the return day. Mark them returned or contact the customer.',
      to: '/bookings?status=ACTIVE&sort=start_asc',
    })
  if (snapshot.overduePickups > 0)
    alerts.push({
      key: 'overdue-pickups',
      tone: 'warning',
      icon: CalendarClock,
      title: `${pluralize(snapshot.overduePickups, 'confirmed booking')} not picked up`,
      detail: 'The pickup day has passed but the booking is not active yet.',
      to: '/bookings?status=CONFIRMED&sort=start_asc',
    })
  if (snapshot.pendingBookings > 0)
    alerts.push({
      key: 'pending',
      tone: 'warning',
      icon: Clock,
      title: `${pluralize(snapshot.pendingBookings, 'booking')} awaiting payment`,
      detail: 'Pending bookings hold their dates until the payment hold expires.',
      to: '/bookings?status=PENDING',
    })
  if (snapshot.pickupsNext7Days > 0)
    alerts.push({
      key: 'pickups',
      tone: 'info',
      icon: CalendarClock,
      title: `${pluralize(snapshot.pickupsNext7Days, 'pickup')} in the next 7 days`,
      detail: 'Prepare the vehicles and hand-over documents.',
      to: `/bookings?status=CONFIRMED&from=${today}&to=${week}&sort=start_asc`,
    })
  if (snapshot.campersByStatus.MAINTENANCE > 0)
    alerts.push({
      key: 'maintenance',
      tone: 'info',
      icon: Wrench,
      title: `${pluralize(snapshot.campersByStatus.MAINTENANCE, 'camper')} in maintenance`,
      detail: 'Not bookable until set back to available.',
      to: '/campers?status=MAINTENANCE',
    })
  if (snapshot.openInquiries > 0)
    alerts.push({
      key: 'inquiries',
      tone: 'info',
      icon: MessageSquare,
      title: `${pluralize(snapshot.openInquiries, 'open inquiry', 'open inquiries')}`,
      detail: 'Customer questions waiting for a reply (managed through the API; no inbox page yet).',
    })

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-medium text-fg">All clear</p>
          <p className="text-[13px] text-fg-3">No overdue rentals, pending payments or upcoming pickups.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-line">
      {alerts.map((alert) => {
        const content = (
          <>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', TONES[alert.tone])}>
              <alert.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-fg">{alert.title}</span>
              <span className="mt-0.5 block text-xs text-fg-3">{alert.detail}</span>
            </span>
            {alert.to && <ChevronRight className="h-4 w-4 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5" aria-hidden />}
          </>
        )
        return (
          <li key={alert.key}>
            {alert.to ? (
              <Link to={alert.to} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-5 py-3">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
