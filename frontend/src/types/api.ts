/*
 * Response types of the FullCamper backend (`backend/src`).
 * They mirror the Mongoose models after JSON serialization:
 *  - ObjectIds arrive as 24-char hex strings;
 *  - Dates arrive as ISO strings (booking dates are UTC midnight of a calendar day);
 *  - optional schema fields may be absent (never `null` unless stated);
 *  - money is a whole number in the business currency (KRW).
 * Keep these in sync with the backend interfaces/validators when they change.
 */

export type ObjectIdString = string
export type IsoDateString = string

/* ---------- Envelope (utils/response.ts, middleware/error.middleware.ts) ---------- */

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

/* ---------- Enums (constants/enums.ts) ---------- */

export type MemberRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER'
export type MemberStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED'
export type CamperStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'ARCHIVED'
export type LicenseType = 'CLASS1_LARGE' | 'CLASS1_ORDINARY' | 'CLASS2_ORDINARY' | 'SPECIAL_TRAILER'
export type ApiFuelType = 'DIESEL' | 'GASOLINE' | 'LPG' | 'HYBRID' | 'ELECTRIC' | 'NONE'
export type ApiTransmission = 'MANUAL' | 'AUTOMATIC' | 'NONE'
export type ExtraChargeType = 'PER_BOOKING' | 'PER_NIGHT'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
export type PaymentProviderName = 'TOSS' | 'MOCK'

/* ---------- Shared ---------- */

export interface ImageDto {
  _id?: ObjectIdString
  url: string
  publicId?: string
  alt?: string
}

interface Timestamps {
  createdAt: IsoDateString
  updatedAt: IsoDateString
}

/* ---------- Members & auth ---------- */

/** Member.toJSON() — password/token fields are stripped by the backend. */
export interface Member extends Timestamps {
  _id: ObjectIdString
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: MemberRole
  status: MemberStatus
  avatar?: ImageDto
  lastLoginAt?: IsoDateString
  passwordChangedAt?: IsoDateString
}

export interface MemberPayload {
  member: Member
}

/* ---------- Catalog ---------- */

export interface Category extends Timestamps {
  _id: ObjectIdString
  name: string
  slug: string
  description?: string
  image?: ImageDto
  isActive: boolean
  sortOrder: number
}

/** `populate("category", "name slug")` */
export interface CategoryRef {
  _id: ObjectIdString
  name: string
  slug: string
}

export interface Feature extends Timestamps {
  _id: ObjectIdString
  name: string
  slug: string
  group?: string
  icon?: string
  isActive: boolean
}

/** `populate("features", "name slug group icon")` */
export interface FeatureRef {
  _id: ObjectIdString
  name: string
  slug: string
  group?: string
  icon?: string
}

export interface CamperExtra {
  _id: ObjectIdString
  name: string
  price: number
  chargeType: ExtraChargeType
  maxQuantity: number
}

export interface CamperSpecifications {
  lengthMm?: number
  widthMm?: number
  heightMm?: number
  weightKg?: number
  fuelType: ApiFuelType
  transmission: ApiTransmission
  engine?: string
  mileageKm?: number
}

export interface CamperLocation {
  region: string
  city?: string
  address?: string
  pickupNotes?: string
}

export interface CamperPricingDto {
  dailyRate: number
  weekendDailyRate?: number
  cleaningFee: number
  securityDeposit: number
}

/** Camper as returned by the public catalog (list, detail, compare): category & features populated. */
export interface Camper extends Timestamps {
  _id: ObjectIdString
  name: string
  slug: string
  category: CategoryRef
  features: FeatureRef[]
  description: string
  highlights: { title: string; description: string }[]
  brand?: string
  company?: string
  baseVehicle?: string
  modelYear?: number
  licenseType: LicenseType
  capacity: { seats: number; sleeps: number }
  specifications: CamperSpecifications
  location: CamperLocation
  pricing: CamperPricingDto
  extras: CamperExtra[]
  minNights: number
  maxNights: number
  images: ImageDto[]
  status: CamperStatus
  isFeatured: boolean
  ratingAverage: number
  ratingCount: number
  viewCount: number
  createdBy?: ObjectIdString
}

/** GET /favorites populates only the category; features stay as ids. */
export type FavoriteCamper = Omit<Camper, 'features'> & { features: ObjectIdString[] }

/** Fields shared by every camper shape the UI renders on a card. */
export type CamperCardData = Pick<
  Camper,
  '_id' | 'name' | 'slug' | 'brand' | 'company' | 'images' | 'pricing' | 'capacity' | 'location' | 'ratingAverage' | 'ratingCount' | 'isFeatured'
> & { category: CategoryRef }

export interface CamperFilterOptions {
  brands: string[]
  companies: string[]
  regions: string[]
  licenseTypes: LicenseType[]
  priceRange: { min: number; max: number }
  maxSeats: number
}

export interface BlockedRange {
  startDate: string
  endDate: string
}

export interface CamperAvailability {
  camperId: ObjectIdString
  blocked: BlockedRange[]
}

export interface CampingPlace extends Timestamps {
  _id: ObjectIdString
  name: string
  slug: string
  city?: string
  region: string
  description?: string
  facilities: string[]
  coordinates?: { latitude: number; longitude: number }
  phone?: string
  workingHours?: { from: string; to: string }
  homepage?: string
  images: ImageDto[]
  isActive: boolean
}

/* ---------- Reviews ---------- */

export interface Review extends Timestamps {
  _id: ObjectIdString
  camper: ObjectIdString
  /** Public lists populate `firstName avatar`; may be null if the member was removed. */
  customer: { _id: ObjectIdString; firstName: string; avatar?: ImageDto } | null
  rating: number
  comment: string
  status: 'PUBLISHED' | 'HIDDEN'
  adminReply?: string
}

export interface RatingSummary {
  average: number
  count: number
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
}

/** GET /campers/:idOrSlug/reviews adds `summary` next to `meta`. */
export interface ReviewListResponse extends ApiSuccess<Review[]> {
  summary: RatingSummary
}

/* ---------- Bookings & payments ---------- */

export interface BookedExtra {
  extraId: ObjectIdString
  name: string
  price: number
  chargeType: ExtraChargeType
  quantity: number
  total: number
}

export interface PriceBreakdown {
  currency: string
  nights: number
  weekdayNights: number
  weekendNights: number
  dailyRate: number
  weekendDailyRate: number
  rentalSubtotal: number
  cleaningFee: number
  extras: BookedExtra[]
  extrasTotal: number
  subtotal: number
  discount: number
  couponCode?: string
  total: number
  securityDeposit: number
}

export interface BookingQuote {
  camperId: ObjectIdString
  startDate: string
  endDate: string
  available: boolean
  price: PriceBreakdown
}

/** `populate("camper", "name slug images location capacity licenseType")`; null if the camper was deleted. */
export interface BookingCamperRef {
  _id: ObjectIdString
  name: string
  slug: string
  images: ImageDto[]
  location: CamperLocation
  capacity: { seats: number; sleeps: number }
  licenseType: LicenseType
}

export interface StatusHistoryEntry {
  status: BookingStatus
  changedBy?: ObjectIdString
  reason?: string
  changedAt: IsoDateString
}

export interface Booking extends Timestamps {
  _id: ObjectIdString
  bookingNumber: string
  customer: ObjectIdString
  camper: BookingCamperRef | null
  startDate: IsoDateString
  endDate: IsoDateString
  nights: number
  status: BookingStatus
  price: PriceBreakdown
  coupon?: ObjectIdString
  paymentStatus: PaymentStatus
  holdExpiresAt?: IsoDateString
  driver: { fullName: string; phone: string; licenseNumber?: string }
  customerNote?: string
  statusHistory: StatusHistoryEntry[]
  cancelledAt?: IsoDateString
  cancellationReason?: string
}

export interface CheckoutSession {
  paymentId: ObjectIdString
  provider: PaymentProviderName
  orderId: string
  orderName: string
  amount: number
  currency: string
  customerName: string
  customerEmail: string
}

export interface Payment extends Timestamps {
  _id: ObjectIdString
  booking: ObjectIdString
  customer: ObjectIdString
  provider: PaymentProviderName
  orderId: string
  amount: number
  currency: string
  status: PaymentStatus
  transactionId?: string
  method?: string
  receiptUrl?: string
  paidAt?: IsoDateString
  failureReason?: string
  refundedAmount: number
}

/* ---------- Settings ---------- */

export interface PublicSettings {
  businessName: string
  contactEmail?: string
  contactPhone?: string
  address?: string
  currency: string
  pickupTime: string
  returnTime: string
  freeCancellationDays: number
  bookingHoldMinutes: number
  minLeadDays: number
  maxAdvanceDays: number
}
