import { ShoppingCart, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button, ButtonLink } from '@/components/common/Button'
import { EmptyState } from '@/components/common/Feedback'
import { ROUTES } from '@/constants/navigation'
import { clearCart, selectCartItems } from '@/features/cart/cartSlice'
import { selectSettings } from '@/features/content/contentSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatPrice } from '@/utils/format'
import { CartLineCard } from './CartLineCard'

/**
 * Trip planner ("Cart" in Figma). Each trip is booked separately because the backend
 * reserves one camper per booking and holds the dates only while the payment is made.
 */
export default function CartPage() {
  useDocumentTitle('Cart')
  const dispatch = useAppDispatch()
  const items = useAppSelector(selectCartItems)
  const quotes = useAppSelector((state) => state.cart.quotes)
  const settings = useAppSelector(selectSettings)

  const priced = items.map((item) => quotes[item.camperId]).filter((q) => q?.status === 'succeeded' && q.data?.available)
  const estimate = priced.reduce((sum, q) => sum + (q?.data?.price.total ?? 0), 0)

  return (
    <div className="container-page py-10 md:py-14">
      <div className="text-center">
        <h1 className="section-title text-[32px]">Cart</h1>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Pick a camper, choose your dates and it will show up here."
          action={<ButtonLink to={ROUTES.campers}>Find a camper</ButtonLink>}
        />
      ) : (
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] xl:gap-10">
          <div className="space-y-6">
            {items.map((item) => <CartLineCard key={item.camperId} item={item} />)}
            <Button variant="ghost" size="sm" onClick={() => dispatch(clearCart())} icon={<Trash2 className="size-4" aria-hidden />}>
              Empty cart
            </Button>
          </div>

          <aside className="rounded-[10px] bg-white p-6 shadow-card lg:sticky lg:top-[118px]" aria-label="Summary">
            <h2 className="text-[24px] font-medium">{items.length === 1 ? items[0]!.name : `${items.length} trips`}</h2>
            <p className="mt-2 text-[28px] font-bold text-brand">{priced.length ? formatPrice(estimate) : '—'}</p>
            <p className="text-xs text-muted">Estimated total for {priced.length} of {items.length} trip(s)</p>
            <h3 className="mt-6 text-base font-medium">How booking works</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
              <li>Choose “Book this trip” and enter the driver’s details.</li>
              <li>
                Your dates are held{settings ? ` for ${settings.bookingHoldMinutes} minutes` : ''} while you complete the payment.
              </li>
              <li>The booking is confirmed as soon as the payment succeeds.</li>
            </ol>
            {settings && (
              <p className="mt-4 rounded-xl bg-brand-soft p-3 text-xs text-brand">
                Free cancellation up to {settings.freeCancellationDays} days before pickup.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
