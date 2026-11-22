import type { Booking, BookingQuote, BookingStatus, CheckoutSession, OwnReview, Paginated, Payment, Review } from '@/types/api'
import { getData, getPaginated, postData, toQueryParams } from './api/apiClient'
import { ENDPOINTS } from './api/endpoints'

export interface ExtraSelection {
  extraId: string
  quantity: number
}

export interface StayRequest {
  camperId: string
  /** YYYY-MM-DD pickup day (inclusive). */
  startDate: string
  /** YYYY-MM-DD return day (exclusive). */
  endDate: string
  extras?: ExtraSelection[]
  couponCode?: string
}

export interface BookingCreateRequest extends StayRequest {
  driver: { fullName: string; phone: string; licenseNumber?: string }
  customerNote?: string
}

export type BookingScope = 'all' | 'upcoming' | 'past'


/** Bookings — backend/src/routes/customer.routes.ts. Prices are always computed by the backend. */
export const bookingApi = {
  quote(body: StayRequest, signal?: AbortSignal): Promise<BookingQuote> {
    return postData<BookingQuote>(ENDPOINTS.bookings.quote, body, { signal })
  },
  create(body: BookingCreateRequest): Promise<Booking> {
    return postData<Booking>(ENDPOINTS.bookings.create, body)
  },
  async list(params: { page?: number; limit?: number; scope?: BookingScope; status?: BookingStatus[] }): Promise<Paginated<Booking>> {
    return getPaginated<Booking>(ENDPOINTS.bookings.list, { params: toQueryParams({ ...params }) })
  },
  get(id: string): Promise<Booking> {
    return getData<Booking>(ENDPOINTS.bookings.detail(id))
  },
  cancel(id: string, reason?: string): Promise<Booking> {
    return postData<Booking>(ENDPOINTS.bookings.cancel(id), reason ? { reason } : {})
  },
}

/**
 * Payments. The provider (Toss in production, a mock in development) collects card
 * details — this app never sees them. Flow: checkout -> provider -> confirm.
 */
export const paymentApi = {
  checkout(bookingId: string): Promise<CheckoutSession> {
    return postData<CheckoutSession>(ENDPOINTS.payments.checkout, { bookingId })
  },
  confirm(body: { transactionId: string; orderId: string; amount: number }): Promise<Payment> {
    return postData<Payment>(ENDPOINTS.payments.confirm, body)
  },
}

export const reviewApi = {
  create(body: { bookingId: string; rating: number; comment: string }): Promise<Review> {
    return postData<Review>(ENDPOINTS.reviews, body)
  },
  /** The customer's review for one booking, or null. Reviews are one per booking, so 100 covers any customer. */
  async findForBooking(bookingId: string): Promise<OwnReview | null> {
    const { items } = await getPaginated<OwnReview>(ENDPOINTS.myReviews, { params: { limit: 100 } })
    return items.find((review) => review.booking === bookingId) ?? null
  },
}
