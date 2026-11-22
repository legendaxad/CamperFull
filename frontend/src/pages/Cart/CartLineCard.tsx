import { CalendarCheck, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperImage } from '@/components/camper/CamperImage'
import { checkoutHref } from '@/utils/checkout'
import { PriceBreakdownList } from '@/components/camper/PriceBreakdownList'
import { ButtonLink } from '@/components/common/Button'
import { ROUTES } from '@/constants/navigation'
import { fetchCartQuote, removeFromCart, selectCartQuote, updateCartItem, type CartItem } from '@/features/cart/cartSlice'
import { showToast } from '@/features/ui/uiSlice'
import { addDaysISO, nightsBetween, todayISO } from '@/utils/dates'
import { formatPrice, pluralize } from '@/utils/format'

/** One planned trip (Figma cart frame: photo card with a price pill). Prices come from POST /bookings/quote. */
export function CartLineCard({ item }: { item: CartItem }) {
  const dispatch = useAppDispatch()
  const quote = useAppSelector((state) => selectCartQuote(state, item.camperId))
  const nights = nightsBetween(item.startDate, item.endDate)
  const datesValid = nights > 0

  useEffect(() => {
    if (datesValid) void dispatch(fetchCartQuote(item))
  }, [dispatch, item, datesValid])

  const remove = () => {
    dispatch(removeFromCart(item.camperId))
    dispatch(showToast(`${item.name} removed from your trips`, 'info'))
  }

  const ready = datesValid && quote?.status === 'succeeded' && quote.data?.available
  return (
    <article className="animate-fade-in overflow-hidden rounded-[10px] bg-white shadow-card">
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <Link to={ROUTES.camper(item.slug)} className="relative block bg-white p-4">
          <CamperImage src={item.image ?? ''} alt={item.name} rounded={false} className="aspect-[16/10] w-full" />
          <span className="absolute inset-x-8 bottom-4 flex items-center justify-center gap-3 rounded-t-[8px] bg-[#e9e9e9] px-4 py-2 text-sm">
            <span>Rental total</span>
            <span className="font-semibold">
              {quote?.status === 'succeeded' && quote.data ? formatPrice(quote.data.price.total, quote.data.price.currency) : '—'}
            </span>
          </span>
        </Link>
        <div className="border-t border-line p-5 md:border-t-0 md:border-l">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                <Link to={ROUTES.camper(item.slug)} className="hover:text-brand">{item.name}</Link>
              </h3>
              <p className="text-xs text-muted">from {formatPrice(item.dailyRate)} / day</p>
            </div>
            <button type="button" onClick={remove} className="rounded-lg p-2 text-danger hover:bg-[#fff6f6]" aria-label={`Remove ${item.name} from trips`}>
              <Trash2 className="size-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium">
              Pickup
              <input
                type="date"
                className="field-input mt-1 h-10 py-0"
                value={item.startDate}
                min={addDaysISO(todayISO(), 1)}
                onChange={(e) => dispatch(updateCartItem({ camperId: item.camperId, startDate: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium">
              Return
              <input
                type="date"
                className="field-input mt-1 h-10 py-0"
                value={item.endDate}
                min={addDaysISO(item.startDate, 1)}
                onChange={(e) => dispatch(updateCartItem({ camperId: item.camperId, endDate: e.target.value }))}
              />
            </label>
          </div>

          <div className="mt-4 min-h-16" aria-live="polite">
            {!datesValid ? (
              <p role="alert" className="text-xs font-medium text-danger">Choose a return date after pickup.</p>
            ) : quote?.status === 'failed' ? (
              <p role="alert" className="text-xs font-medium text-danger">{quote.error}</p>
            ) : quote?.status !== 'succeeded' || !quote.data ? (
              <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-1/2" /></div>
            ) : !quote.data.available ? (
              <p role="alert" className="text-xs font-medium text-danger">These dates are already booked. Please pick other dates.</p>
            ) : (
              <details>
                <summary className="cursor-pointer text-xs text-muted">
                  {pluralize(quote.data.price.nights, 'night')} · price details
                </summary>
                <PriceBreakdownList price={quote.data.price} className="mt-3" />
              </details>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <ButtonLink
              to={checkoutHref(item.camperId, item)}
              size="sm"
              icon={<CalendarCheck className="size-4" aria-hidden />}
              aria-disabled={!ready}
              className={ready ? undefined : 'pointer-events-none opacity-55'}
            >
              Book this trip
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  )
}
