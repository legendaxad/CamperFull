import { useEffect, useState } from 'react'
import { describeError, toApiError } from '@/services/api/errors'
import { bookingApi, type StayRequest } from '@/services/bookingApi'
import type { BookingQuote } from '@/types/api'
import { isValidISODate } from '@/utils/dates'

export interface QuoteState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  quote: BookingQuote | null
  error: string | null
}

const QUOTE_DEBOUNCE_MS = 300

/**
 * Live price from POST /bookings/quote (the backend is the only pricing authority:
 * weekend rates, extras, cleaning fee and coupons are all applied server-side).
 * Debounced and cancellable, so typing in date pickers sends one request.
 * This is transient form feedback, so it is kept local rather than in Redux.
 */
export function useBookingQuote(request: StayRequest | null): QuoteState {
  const [state, setState] = useState<QuoteState>({ status: 'idle', quote: null, error: null })
  const key = request ? JSON.stringify(request) : null

  useEffect(() => {
    if (!key) {
      setState({ status: 'idle', quote: null, error: null })
      return
    }
    const body = JSON.parse(key) as StayRequest
    if (!isValidISODate(body.startDate) || !isValidISODate(body.endDate) || body.endDate <= body.startDate) {
      setState({ status: 'idle', quote: null, error: null })
      return
    }
    const controller = new AbortController()
    setState((s) => ({ ...s, status: 'loading', error: null }))
    const timer = window.setTimeout(() => {
      bookingApi
        .quote(body, controller.signal)
        .then((quote) => setState({ status: 'succeeded', quote, error: null }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          // Coupon rejections carry the specific reason (expired, already used...) as a field error.
          setState({ status: 'failed', quote: null, error: toApiError(error).fieldMessage('couponCode') ?? describeError(error) })
        })
    }, QUOTE_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [key])

  return state
}
