import type { PriceBreakdown } from '@/types/api'
import { cn } from '@/utils/cn'
import { formatPrice, pluralize } from '@/utils/format'

/** Renders the backend's PriceBreakdown exactly as calculated by the server. */
export function PriceBreakdownList({ price, className }: { price: PriceBreakdown; className?: string }) {
  const money = (amount: number) => formatPrice(amount, price.currency)
  return (
    <dl className={cn('space-y-2 text-sm', className)}>
      {price.weekdayNights > 0 && (
        <div className="flex justify-between gap-3">
          <dt>{money(price.dailyRate)} × {pluralize(price.weekdayNights, 'night')}</dt>
          <dd>{money(price.dailyRate * price.weekdayNights)}</dd>
        </div>
      )}
      {price.weekendNights > 0 && (
        <div className="flex justify-between gap-3">
          <dt>{money(price.weekendDailyRate)} × {pluralize(price.weekendNights, 'weekend night')}</dt>
          <dd>{money(price.weekendDailyRate * price.weekendNights)}</dd>
        </div>
      )}
      {price.cleaningFee > 0 && (
        <div className="flex justify-between gap-3">
          <dt>Cleaning fee</dt>
          <dd>{money(price.cleaningFee)}</dd>
        </div>
      )}
      {price.extras.map((extra) => (
        <div key={extra.extraId} className="flex justify-between gap-3">
          <dt>
            {extra.name}
            {extra.quantity > 1 && ` ×${extra.quantity}`}
          </dt>
          <dd>{money(extra.total)}</dd>
        </div>
      ))}
      {price.discount > 0 && (
        <div className="flex justify-between gap-3 text-success">
          <dt>Discount{price.couponCode ? ` (${price.couponCode})` : ''}</dt>
          <dd>− {money(price.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-bold">
        <dt>Total</dt>
        <dd>{money(price.total)}</dd>
      </div>
      {price.securityDeposit > 0 && (
        <p className="text-xs text-muted">+ {money(price.securityDeposit)} refundable security deposit at pickup</p>
      )}
    </dl>
  )
}
