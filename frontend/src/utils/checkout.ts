import { ROUTES } from '@/constants/navigation'
import type { ExtraSelection } from '@/services/bookingApi'

/** Encodes extras for the checkout URL: "extraId:qty,extraId:qty". */
export function encodeExtras(extras: ExtraSelection[]): string {
  return extras.map((e) => `${e.extraId}:${e.quantity}`).join(',')
}

export function decodeExtras(value: string | null): ExtraSelection[] {
  if (!value) return []
  return value
    .split(',')
    .map((part) => part.split(':'))
    .filter(([id, qty]) => id && /^[a-f\d]{24}$/i.test(id) && Number(qty) > 0)
    .map(([id, qty]) => ({ extraId: id!, quantity: Number(qty) }))
}

/** Link to the checkout page for one stay (dates and extras travel in the query string). */
export function checkoutHref(camperId: string, stay: { startDate: string; endDate: string; extras: ExtraSelection[] }): string {
  const params = new URLSearchParams({ from: stay.startDate, to: stay.endDate })
  if (stay.extras.length) params.set('extras', encodeExtras(stay.extras))
  return `${ROUTES.checkout(camperId)}?${params.toString()}`
}
