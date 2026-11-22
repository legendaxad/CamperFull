import { CalendarDays, CalendarX2, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/common/Button'
import { useBookingQuote } from '@/hooks/useBookingQuote'
import { useCamperActions } from '@/hooks/useCamperActions'
import { camperApi } from '@/services/camperApi'
import type { ExtraSelection } from '@/services/bookingApi'
import { checkoutHref } from '@/utils/checkout'
import type { BlockedRange, Camper } from '@/types/api'
import { addDaysISO, nightsBetween, todayISO } from '@/utils/dates'
import { formatDate, formatPrice, pluralize } from '@/utils/format'
import { PriceBreakdownList } from './PriceBreakdownList'

const AVAILABILITY_WINDOW_DAYS = 180

/** Date & extras picker with a live server quote (POST /bookings/quote). */
export function BookingWidget({ camper }: { camper: Camper }) {
  const { addCamperToCart } = useCamperActions()
  const navigate = useNavigate()
  const minStart = addDaysISO(todayISO(), 1)
  const [startDate, setStartDate] = useState(minStart)
  const [endDate, setEndDate] = useState(addDaysISO(minStart, Math.max(camper.minNights, 2)))
  const [extras, setExtras] = useState<ExtraSelection[]>([])
  const [blocked, setBlocked] = useState<BlockedRange[]>([])

  // Booked periods for the next months, so customers can avoid them up-front.
  useEffect(() => {
    let active = true
    camperApi
      .availability(camper._id, todayISO(), addDaysISO(todayISO(), AVAILABILITY_WINDOW_DAYS))
      .then((result) => active && setBlocked(result.blocked))
      .catch(() => active && setBlocked([]))
    return () => {
      active = false
    }
  }, [camper._id])

  const nights = nightsBetween(startDate, endDate)
  const localIssue =
    nights < 1
      ? 'Choose a return date after pickup.'
      : nights < camper.minNights || nights > camper.maxNights
        ? `This camper can be rented for ${camper.minNights}–${camper.maxNights} nights.`
        : null

  const request = useMemo(
    () => (localIssue ? null : { camperId: camper._id, startDate, endDate, extras }),
    [localIssue, camper._id, startDate, endDate, extras],
  )
  const { status, quote, error } = useBookingQuote(request)
  const unavailable = quote ? !quote.available : false
  const canBook = !localIssue && status === 'succeeded' && !unavailable

  const setExtraQuantity = (extraId: string, quantity: number) =>
    setExtras((current) => {
      const rest = current.filter((e) => e.extraId !== extraId)
      return quantity > 0 ? [...rest, { extraId, quantity }] : rest
    })

  const stay = { startDate, endDate, extras }
  const inputClass = 'field-input h-11 py-0'

  return (
    <section aria-labelledby="booking-title" className="rounded-[20px] bg-white p-5 shadow-card md:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="booking-title" className="text-lg font-semibold">Book this camper</h2>
        <p className="text-2xl font-bold text-brand">
          {formatPrice(camper.pricing.dailyRate)}
          <span className="text-xs font-medium text-muted"> / day</span>
        </p>
      </div>
      {camper.pricing.weekendDailyRate && camper.pricing.weekendDailyRate !== camper.pricing.dailyRate && (
        <p className="mt-1 text-right text-xs text-muted">Weekend nights {formatPrice(camper.pricing.weekendDailyRate)}</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-xs font-medium">
          <span className="mb-1 flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden /> Pickup</span>
          <input
            type="date"
            className={inputClass}
            value={startDate}
            min={minStart}
            onChange={(e) => {
              setStartDate(e.target.value)
              if (e.target.value >= endDate) setEndDate(addDaysISO(e.target.value, Math.max(camper.minNights, 1)))
            }}
          />
        </label>
        <label className="text-xs font-medium">
          <span className="mb-1 flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden /> Return</span>
          <input type="date" className={inputClass} value={endDate} min={addDaysISO(startDate, 1)} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      {camper.extras.length > 0 && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-medium">Extras</legend>
          <ul className="space-y-2">
            {camper.extras.map((extra) => {
              const selected = extras.find((e) => e.extraId === extra._id)
              return (
                <li key={extra._id} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm">
                  <label className="flex flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand"
                      checked={Boolean(selected)}
                      onChange={(e) => setExtraQuantity(extra._id, e.target.checked ? 1 : 0)}
                    />
                    <span>
                      {extra.name}
                      <span className="block text-xs text-muted">
                        {formatPrice(extra.price)} {extra.chargeType === 'PER_NIGHT' ? 'per night' : 'per booking'}
                      </span>
                    </span>
                  </label>
                  {selected && extra.maxQuantity > 1 && (
                    <select
                      aria-label={`${extra.name} quantity`}
                      value={selected.quantity}
                      onChange={(e) => setExtraQuantity(extra._id, Number(e.target.value))}
                      className="h-8 rounded-md border border-line bg-white px-1 text-xs"
                    >
                      {Array.from({ length: extra.maxQuantity }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>×{n}</option>
                      ))}
                    </select>
                  )}
                </li>
              )
            })}
          </ul>
        </fieldset>
      )}

      <div className="mt-5 min-h-24" aria-live="polite">
        {localIssue ? (
          <p role="alert" className="rounded-xl bg-[#fff6f6] p-3 text-xs font-medium text-danger">{localIssue}</p>
        ) : status === 'failed' ? (
          <p role="alert" className="rounded-xl bg-[#fff6f6] p-3 text-xs font-medium text-danger">{error}</p>
        ) : status !== 'succeeded' || !quote ? (
          <div className="space-y-2" aria-label="Calculating price">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-5 w-1/2" />
          </div>
        ) : (
          <>
            {unavailable && (
              <p role="alert" className="mb-3 rounded-xl bg-[#fff6f6] p-3 text-xs font-medium text-danger">
                These dates are already booked. Please choose other dates.
              </p>
            )}
            <PriceBreakdownList price={quote.price} />
          </>
        )}
      </div>

      {blocked.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary className="flex cursor-pointer items-center gap-1 font-medium">
            <CalendarX2 className="size-3.5" aria-hidden /> Already booked dates ({blocked.length})
          </summary>
          <ul className="mt-2 space-y-1 pl-5">
            {blocked.map((range) => (
              <li key={range.startDate}>
                {formatDate(range.startDate)} → {formatDate(range.endDate)}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={() => addCamperToCart(camper, stay)}
          disabled={Boolean(localIssue)}
          icon={<ShoppingCart className="size-4" aria-hidden />}
        >
          Add to trips
        </Button>
        <Button onClick={() => navigate(checkoutHref(camper._id, stay))} disabled={!canBook}>
          Book now
        </Button>
      </div>
      {!localIssue && nights > 0 && (
        <p className="mt-2 text-center text-xs text-muted">{pluralize(nights, 'night')} · nothing is charged until you confirm</p>
      )}
    </section>
  )
}
