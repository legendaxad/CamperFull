import { AlertTriangle, BellRing, CalendarPlus, CalendarSync, CreditCard, MessageSquare, Star, Undo2 } from 'lucide-react'
import type { AppNotification, NotificationType } from '@/types/api'
import { cn } from '@/utils/cn'

const META: Record<NotificationType, { icon: typeof BellRing; className: string; label: string }> = {
  BOOKING_CREATED: { icon: CalendarPlus, className: 'bg-info-soft text-info', label: 'New booking' },
  BOOKING_STATUS_CHANGED: { icon: CalendarSync, className: 'bg-info-soft text-info', label: 'Booking update' },
  PAYMENT_SUCCEEDED: { icon: CreditCard, className: 'bg-success-soft text-success', label: 'Payment' },
  PAYMENT_FAILED: { icon: AlertTriangle, className: 'bg-danger-soft text-danger', label: 'Payment issue' },
  PAYMENT_REFUNDED: { icon: Undo2, className: 'bg-neutral-soft text-fg-2', label: 'Refund' },
  REVIEW_CREATED: { icon: Star, className: 'bg-accent-soft text-accent-ink', label: 'Review' },
  INQUIRY_RECEIVED: { icon: MessageSquare, className: 'bg-warning-soft text-warning', label: 'Inquiry' },
  SYSTEM: { icon: BellRing, className: 'bg-neutral-soft text-fg-2', label: 'System' },
}

export const NOTIFICATION_TYPE_LABELS = Object.fromEntries(Object.entries(META).map(([type, meta]) => [type, meta.label])) as Record<NotificationType, string>

export function NotificationIcon({ type, className }: { type: NotificationType; className?: string }) {
  const meta = META[type] ?? META.SYSTEM
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.className, className)}>
      <meta.icon className="h-4 w-4" aria-hidden />
    </span>
  )
}

/** Where a notification points, based on the ids the backend stores in `data`. */
export function notificationLink(notification: AppNotification): string | null {
  const data = notification.data ?? {}
  if (data.bookingId) return `/bookings/${data.bookingId}`
  if (data.paymentId) return `/payments/${data.paymentId}`
  return null
}
