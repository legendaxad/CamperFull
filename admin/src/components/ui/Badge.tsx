import type { ReactNode } from 'react'
import type { BookingStatus, CamperStatus, MemberStatus, PaymentStatus } from '@/types/api'
import { cn } from '@/utils/cn'
import { BOOKING_STATUS_META, CAMPER_STATUS_META, MEMBER_STATUS_META, PAYMENT_STATUS_META, type Tone } from '@/utils/status'

const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-neutral-soft text-fg-2', dot: 'bg-fg-3' },
  accent: { badge: 'bg-accent-soft text-accent-ink', dot: 'bg-accent' },
  success: { badge: 'bg-success-soft text-success', dot: 'bg-success' },
  warning: { badge: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  danger: { badge: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  info: { badge: 'bg-info-soft text-info', dot: 'bg-info' },
}

export function toneText(tone: Tone): string {
  return TONES[tone].badge.split(' ')[1] ?? ''
}

export function Badge({ tone = 'neutral', children, dot = true, className, title }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone].badge, className)}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', TONES[tone].dot)} aria-hidden />}
      {children}
    </span>
  )
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status]
  return (
    <Badge tone={meta.tone} title={meta.description}>
      {meta.label}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS_META[status]
  return (
    <Badge tone={meta.tone} title={meta.description}>
      {meta.label}
    </Badge>
  )
}

export function CamperStatusBadge({ status }: { status: CamperStatus }) {
  const meta = CAMPER_STATUS_META[status]
  return (
    <Badge tone={meta.tone} title={meta.description}>
      {meta.label}
    </Badge>
  )
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const meta = MEMBER_STATUS_META[status]
  return (
    <Badge tone={meta.tone} title={meta.description}>
      {meta.label}
    </Badge>
  )
}
