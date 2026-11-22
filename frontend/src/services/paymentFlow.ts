import type { CheckoutSession, Payment, PaymentProviderName } from '@/types/api'
import { ApiError } from './api/errors'
import { paymentApi } from './bookingApi'

/*
 * Payment orchestration: checkout (server creates the order & amount) -> provider
 * collects payment -> confirm (server verifies and confirms the booking).
 *
 * Each provider implements only the middle step. The backend decides which provider is
 * active (`CheckoutSession.provider`); the frontend just needs a matching adapter.
 */
interface ProviderAdapter {
  /** Collects the payment and returns the provider's transaction id. */
  pay(session: CheckoutSession): Promise<string>
}

/** Development provider (backend PAYMENT_PROVIDER=mock): any transaction id is accepted. */
const mockProvider: ProviderAdapter = {
  async pay(session) {
    return `mock_${session.orderId}`
  },
}

const providers: Partial<Record<PaymentProviderName, ProviderAdapter>> = {
  MOCK: mockProvider,
  // TOSS: add an adapter that opens the Toss Payments widget with VITE_TOSS_CLIENT_KEY and
  // resolves with the `paymentKey` from the success redirect.
}

export async function completePayment(bookingId: string): Promise<Payment> {
  const session = await paymentApi.checkout(bookingId)
  const provider = providers[session.provider]
  if (!provider) {
    throw new ApiError('Online payment is not available yet. Please contact us to complete your booking.', null)
  }
  const transactionId = await provider.pay(session)
  return paymentApi.confirm({ transactionId, orderId: session.orderId, amount: session.amount })
}
