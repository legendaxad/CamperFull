import type { BookingStatus, CamperStatus, LicenseType, MemberStatus, PaymentStatus } from '@/types/api'

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

interface StatusMeta {
  label: string
  tone: Tone
  description: string
}

/** Labels and meaning of the backend's booking lifecycle (backend services/Booking.service.ts). */
export const BOOKING_STATUS_META: Record<BookingStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning', description: 'Created, awaiting payment. Dates are held until the payment hold expires.' },
  CONFIRMED: { label: 'Confirmed', tone: 'info', description: 'Paid or confirmed by an admin. Awaiting pickup.' },
  ACTIVE: { label: 'Active', tone: 'accent', description: 'Picked up. The camper is on the road.' },
  COMPLETED: { label: 'Completed', tone: 'success', description: 'Returned. The rental is finished.' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', description: 'Cancelled by the customer, an admin, or an expired payment hold.' },
  REJECTED: { label: 'Rejected', tone: 'danger', description: 'Rejected by an admin before confirmation.' },
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  PENDING: { label: 'Pending', tone: 'warning', description: 'Checkout started, not yet captured.' },
  PAID: { label: 'Paid', tone: 'success', description: 'Captured by the payment provider.' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', tone: 'info', description: 'Captured, part of the amount refunded.' },
  REFUNDED: { label: 'Refunded', tone: 'neutral', description: 'Fully refunded.' },
  FAILED: { label: 'Failed', tone: 'danger', description: 'Declined or failed verification.' },
}

export const CAMPER_STATUS_META: Record<CamperStatus, StatusMeta> = {
  AVAILABLE: { label: 'Available', tone: 'success', description: 'Listed and bookable.' },
  UNAVAILABLE: { label: 'Unavailable', tone: 'neutral', description: 'Hidden from the catalog; existing bookings are kept.' },
  MAINTENANCE: { label: 'Maintenance', tone: 'warning', description: 'In maintenance; hidden from the catalog.' },
  ARCHIVED: { label: 'Archived', tone: 'neutral', description: 'Retired. Kept for booking history.' },
}

export const MEMBER_STATUS_META: Record<MemberStatus, StatusMeta> = {
  ACTIVE: { label: 'Active', tone: 'success', description: 'Can sign in.' },
  BLOCKED: { label: 'Blocked', tone: 'danger', description: 'Cannot sign in; all sessions were revoked.' },
  DELETED: { label: 'Deleted', tone: 'neutral', description: 'Account removed.' },
}

export const LICENSE_LABELS: Record<LicenseType, string> = {
  CLASS1_LARGE: 'Class 1 Large',
  CLASS1_ORDINARY: 'Class 1 Ordinary',
  CLASS2_ORDINARY: 'Class 2 Ordinary',
  SPECIAL_TRAILER: 'Special (Trailer)',
}

/**
 * Admin transitions allowed by the backend (ALLOWED_TRANSITIONS). ACTIVE also
 * requires the pickup date to have arrived; the server enforces it either way.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
}

export const BOOKING_ACTION_LABELS: Partial<Record<BookingStatus, string>> = {
  CONFIRMED: 'Confirm',
  REJECTED: 'Reject',
  CANCELLED: 'Cancel booking',
  ACTIVE: 'Mark picked up',
  COMPLETED: 'Mark returned',
}
