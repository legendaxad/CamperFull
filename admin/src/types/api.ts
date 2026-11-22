/*
 * Response types of the FullCamper backend (`backend/src`), as seen by the admin API.
 *  - ObjectIds arrive as 24-char hex strings, Dates as ISO strings;
 *  - booking dates are calendar days stored as UTC midnight (endDate exclusive);
 *  - money is a whole number of KRW.
 * Keep in sync with backend interfaces/validators and services/Dashboard.service.ts.
 */

export type Id = string
export type IsoDate = string

/* ---------- Envelope ---------- */

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
  meta?: PaginationMeta
}

export interface ApiErrorDetail {
  field?: string
  message: string
}

export interface ApiErrorBody {
  success: false
  message: string
  errors: ApiErrorDetail[]
}

export interface Paginated<T> {
  items: T[]
  meta: PaginationMeta
}

/* ---------- Enums (backend constants/enums.ts) ---------- */

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const CAMPER_STATUSES = ['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE', 'ARCHIVED'] as const
export type CamperStatus = (typeof CAMPER_STATUSES)[number]

export const LICENSE_TYPES = ['CLASS1_LARGE', 'CLASS1_ORDINARY', 'CLASS2_ORDINARY', 'SPECIAL_TRAILER'] as const
export type LicenseType = (typeof LICENSE_TYPES)[number]

export const FUEL_TYPES = ['DIESEL', 'GASOLINE', 'LPG', 'HYBRID', 'ELECTRIC', 'NONE'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const TRANSMISSIONS = ['AUTOMATIC', 'MANUAL', 'NONE'] as const
export type Transmission = (typeof TRANSMISSIONS)[number]

export type ExtraChargeType = 'PER_BOOKING' | 'PER_NIGHT'
export type MemberRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER'
export type MemberStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED'
export type PaymentProviderName = 'TOSS' | 'MOCK'

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_STATUS_CHANGED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'REVIEW_CREATED'
  | 'INQUIRY_RECEIVED'
  | 'SYSTEM'

/* ---------- Shared ---------- */

export interface ImageDto {
  _id?: Id
  url: string
  publicId?: string
  alt?: string
}

interface Timestamps {
  createdAt: IsoDate
  updatedAt: IsoDate
}

/* ---------- Members ---------- */

export interface Member extends Timestamps {
  _id: Id
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: MemberRole
  status: MemberStatus
  avatar?: ImageDto
  lastLoginAt?: IsoDate
}

export interface CustomerStats {
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  /** Net of refunds, from PAID / PARTIALLY_REFUNDED payments. */
  totalSpent: number
  lastBookingAt?: IsoDate
}

export interface CustomerDetail {
  customer: Member
  stats: CustomerStats
}

/* ---------- Catalog ---------- */

export interface Category extends Timestamps {
  _id: Id
  name: string
  slug: string
  isActive: boolean
}

export interface Feature extends Timestamps {
  _id: Id
  name: string
  slug: string
  group?: string
  isActive: boolean
}

export interface CamperExtra {
  _id?: Id
  name: string
  price: number
  chargeType: ExtraChargeType
  maxQuantity: number
}

export interface Camper extends Timestamps {
  _id: Id
  name: string
  slug: string
  category: { _id: Id; name: string; slug: string } | null
  features: { _id: Id; name: string; slug: string; group?: string }[]
  description: string
  highlights: { title: string; description: string }[]
  brand?: string
  company?: string
  baseVehicle?: string
  modelYear?: number
  licenseType: LicenseType
  capacity: { seats: number; sleeps: number }
  specifications: {
    lengthMm?: number
    widthMm?: number
    heightMm?: number
    weightKg?: number
    fuelType: FuelType
    transmission: Transmission
    engine?: string
    mileageKm?: number
  }
  location: { region: string; city?: string; address?: string; pickupNotes?: string }
  pricing: { dailyRate: number; weekendDailyRate?: number; cleaningFee: number; securityDeposit: number }
  extras: CamperExtra[]
  minNights: number
  maxNights: number
  images: ImageDto[]
  status: CamperStatus
  isFeatured: boolean
  ratingAverage: number
  ratingCount: number
  viewCount: number
}

/* ---------- Bookings & payments ---------- */

export interface PriceBreakdown {
  currency: string
  nights: number
  weekdayNights: number
  weekendNights: number
  dailyRate: number
  weekendDailyRate: number
  rentalSubtotal: number
  cleaningFee: number
  extras: { extraId: Id; name: string; price: number; chargeType: ExtraChargeType; quantity: number; total: number }[]
  extrasTotal: number
  subtotal: number
  discount: number
  couponCode?: string
  total: number
  securityDeposit: number
}

export interface StatusHistoryEntry {
  status: BookingStatus
  changedBy?: Id
  reason?: string
  changedAt: IsoDate
}

export interface BookingCamperRef {
  _id: Id
  name: string
  slug: string
  images: ImageDto[]
  location: { region: string; city?: string }
}

export interface BookingCustomerRef {
  _id: Id
  firstName: string
  lastName: string
  email: string
  phone?: string
}

/** Admin booking: camper and customer are populated (null if the record was removed). */
export interface Booking extends Timestamps {
  _id: Id
  bookingNumber: string
  customer: BookingCustomerRef | null
  camper: BookingCamperRef | null
  startDate: IsoDate
  endDate: IsoDate
  nights: number
  status: BookingStatus
  price: PriceBreakdown
  paymentStatus: PaymentStatus
  holdExpiresAt?: IsoDate
  driver: { fullName: string; phone: string; licenseNumber?: string }
  customerNote?: string
  adminNote?: string
  statusHistory: StatusHistoryEntry[]
  cancelledAt?: IsoDate
  cancellationReason?: string
}

export interface Refund {
  _id: Id
  amount: number
  reason: string
  transactionKey?: string
  processedBy?: { _id: Id; firstName: string; lastName: string } | Id
  refundedAt: IsoDate
}

export interface Payment extends Timestamps {
  _id: Id
  booking: { _id: Id; bookingNumber: string; startDate: IsoDate; endDate: IsoDate; status: BookingStatus; price?: PriceBreakdown } | null
  customer: BookingCustomerRef | null
  provider: PaymentProviderName
  orderId: string
  amount: number
  currency: string
  status: PaymentStatus
  transactionId?: string
  method?: string
  receiptUrl?: string
  paidAt?: IsoDate
  failureReason?: string
  refundedAmount: number
  refunds?: Refund[]
}

/* ---------- Notifications & settings ---------- */

export interface AppNotification extends Timestamps {
  _id: Id
  type: NotificationType
  title: string
  message: string
  data?: Record<string, string>
  isRead: boolean
  readAt?: IsoDate
}

export interface BusinessSettings extends Timestamps {
  businessName: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  currency: string
  bookingHoldMinutes: number
  freeCancellationDays: number
  minLeadDays: number
  maxAdvanceDays: number
  pickupTime: string
  returnTime: string
  weekendNights: number[]
}

/* ---------- Dashboard / analytics (services/Dashboard.service.ts) ---------- */

export type Interval = 'day' | 'week' | 'month' | 'year'

export interface RangeInfo {
  from: string
  to: string
  days: number
}

export interface PeriodMetrics {
  revenue: number
  bookings: { total: number; byStatus: Record<BookingStatus, number> }
  bookedCount: number
  bookedValue: number
  averageBookingValue: number | null
  cancellationRate: number | null
  cancelledAfterConfirmation: number
  expiredUnpaid: number
  rejected: number
  newCustomers: number
  occupancyRate: number | null
  bookedNights: number
  fleetSize: number
}

export interface KpiSnapshot {
  campersByStatus: Record<CamperStatus, number>
  activeCampers: number
  fleetSize: number
  totalCustomers: number
  pendingBookings: number
  openInquiries: number
  pickupsNext7Days: number
  returnsNext7Days: number
  overduePickups: number
  overdueReturns: number
}

export interface KpiResponse {
  currency: string
  range: RangeInfo
  previousRange: RangeInfo
  current: PeriodMetrics
  previous: PeriodMetrics
  snapshot: KpiSnapshot
}

export interface RevenuePoint {
  period: string
  revenue: number
  refunded: number
  payments: number
}

export interface BookingPoint {
  period: string
  bookings: number
  confirmed: number
  cancelled: number
  value: number
}

export interface TopCamper {
  camperId: Id
  name: string
  slug: string
  image?: string
  ratingAverage: number
  revenue: number
  bookings: number
  nights: number
}

export interface FleetCamper {
  camperId: Id
  name: string
  slug: string
  status: CamperStatus
  image?: string
  region?: string
  dailyRate: number
  ratingAverage: number
  bookings: number
  bookedNights: number
  occupiedToday: boolean
  revenue: number
  utilization: number
}

export interface FleetResponse {
  range: RangeInfo
  campers: FleetCamper[]
}

export interface TopCustomer {
  customerId: Id
  firstName: string
  lastName: string
  email: string
  avatar?: string
  spent: number
  payments: number
}

export interface CustomerAnalytics {
  range: RangeInfo
  series: { period: string; registrations: number; totalCustomers: number }[]
  customersWithBookings: number
  repeatCustomers: number
  bookingCustomersInRange: number
  returningInRange: number
  topCustomers: TopCustomer[]
}

export interface PaymentSummary {
  currency: string
  range: RangeInfo
  byStatus: Record<PaymentStatus, { count: number; amount: number }>
  captured: { count: number; gross: number; refunded: number; net: number }
  refundsIssued: { count: number; amount: number }
  methods: { method: string; count: number; amount: number }[]
}

export type ActivityType = 'BOOKING_STATUS' | 'PAYMENT_CAPTURED' | 'PAYMENT_FAILED' | 'REFUND' | 'CUSTOMER_REGISTERED'

export interface ActivityItem {
  type: ActivityType
  at: IsoDate
  actor: { _id: Id; firstName: string; lastName: string; role: MemberRole } | null
  status?: BookingStatus
  reason?: string
  amount?: number
  currency?: string
  bookingId?: Id
  bookingNumber?: string
  paymentId?: Id
  orderId?: string
  customerId?: Id
}

export interface ActivityPage {
  items: ActivityItem[]
  hasMore: boolean
  page: number
  limit: number
}

export interface Overview {
  revenue: { total: number; last30Days: number; currency: string }
  bookings: { total: number; byStatus: Record<BookingStatus, number>; averageValue: number }
  customers: { total: number; newLast30Days: number }
  campers: { total: number; byStatus: Record<CamperStatus, number> }
  openInquiries: number
  recentBookings: (Omit<Booking, 'camper' | 'customer'> & {
    camper: { _id: Id; name: string; slug: string } | null
    customer: { _id: Id; firstName: string; lastName: string; email: string } | null
  })[]
  recentCustomers: Member[]
  upcomingReservations: (Omit<Booking, 'camper'> & { camper: { _id: Id; name: string; slug: string } | null })[]
}
