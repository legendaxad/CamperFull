import type { CamperPricing } from '@/types/camper'

export interface RentalQuote {
  nights: number
  base: number
  discountPct: number
  discount: number
  fees: number
  total: number
  deposit: number
}

export const WEEKLY_THRESHOLD_NIGHTS = 7
export const MONTHLY_THRESHOLD_NIGHTS = 28

/**
 * Calculates a rental quote. Monthly discount wins over weekly; the security deposit is
 * refundable and therefore reported separately from the total.
 * Used only for the example prices in the local listing wizard; marketplace prices always come
 * from POST /bookings/quote.
 */
export function quoteRental(pricing: CamperPricing, nights: number): RentalQuote {
  const safeNights = Math.max(0, Math.floor(nights))
  const base = pricing.dailyPrice * safeNights
  const discountPct =
    safeNights >= MONTHLY_THRESHOLD_NIGHTS
      ? pricing.monthlyDiscountPct
      : safeNights >= WEEKLY_THRESHOLD_NIGHTS
        ? pricing.weeklyDiscountPct
        : 0
  const discount = Math.round((base * discountPct) / 100)
  const fees = safeNights
    ? pricing.additionalFees.reduce(
        (sum, fee) => sum + (fee.per === 'day' ? fee.amount * safeNights : fee.amount),
        0,
      )
    : 0
  return {
    nights: safeNights,
    base,
    discountPct,
    discount,
    fees,
    total: base - discount + fees,
    deposit: pricing.securityDeposit,
  }
}
