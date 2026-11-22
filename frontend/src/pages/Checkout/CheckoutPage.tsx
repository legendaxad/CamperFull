import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, CalendarDays, Lock, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { decodeExtras } from '@/utils/checkout'
import { CamperImage } from '@/components/camper/CamperImage'
import { PriceBreakdownList } from '@/components/camper/PriceBreakdownList'
import { Button, ButtonLink } from '@/components/common/Button'
import { ErrorState, Skeleton } from '@/components/common/Feedback'
import { FormField, TextArea, TextInput } from '@/components/forms/FormField'
import { ROUTES } from '@/constants/navigation'
import { normalizePhone } from '@/features/auth/authSchemas'
import { fullName, selectCurrentUser } from '@/features/auth/authSlice'
import { couponSchema, driverSchema, type DriverValues } from '@/features/bookings/bookingSchemas'
import { createBooking } from '@/features/bookings/bookingSlice'
import { selectCamperByIdOrSlug, selectDetailRequest } from '@/features/campers/camperSelectors'
import { fetchCamperDetail } from '@/features/campers/camperSlice'
import { selectSettings } from '@/features/content/contentSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useBookingQuote } from '@/hooks/useBookingQuote'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { applyServerFieldErrors } from '@/hooks/useServerFieldErrors'
import { coverImage } from '@/utils/camper'
import { isValidISODate } from '@/utils/dates'
import { formatDate, pluralize } from '@/utils/format'
import NotFoundPage from '../NotFound/NotFoundPage'

const DRIVER_FIELDS = ['fullName', 'phone', 'licenseNumber', 'customerNote'] as const

/**
 * Booking checkout: driver details + optional coupon -> POST /bookings (PENDING hold) ->
 * booking page, where payment completes it. The backend re-validates everything.
 */
export default function CheckoutPage() {
  useDocumentTitle('Checkout')
  const { camperId = '' } = useParams()
  const [params] = useSearchParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)
  const settings = useAppSelector(selectSettings)
  const camper = useAppSelector((state) => selectCamperByIdOrSlug(state, camperId))
  const request = useAppSelector((state) => selectDetailRequest(state, camperId))

  const startDate = params.get('from') ?? ''
  const endDate = params.get('to') ?? ''
  const extrasParam = params.get('extras')
  const extras = useMemo(() => decodeExtras(extrasParam), [extrasParam])
  const datesValid = isValidISODate(startDate) && isValidISODate(endDate) && endDate > startDate

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!camper) void dispatch(fetchCamperDetail(camperId))
  }, [dispatch, camper, camperId])

  const quoteRequest = useMemo(
    () => (datesValid ? { camperId, startDate, endDate, extras, couponCode: appliedCoupon } : null),
    [datesValid, camperId, startDate, endDate, extras, appliedCoupon],
  )
  const quote = useBookingQuote(quoteRequest)

  // An invalid coupon makes the quote fail; fall back to the price without it.
  useEffect(() => {
    if (appliedCoupon && quote.status === 'failed') {
      setCouponError(quote.error)
      setAppliedCoupon(undefined)
    }
  }, [appliedCoupon, quote.status, quote.error])

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<DriverValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      fullName: user ? fullName(user) : '',
      phone: user?.phone ?? '',
      licenseNumber: '',
      customerNote: '',
    },
  })

  if (request?.status === 'failed' && request.notFound) return <NotFoundPage />
  if (!datesValid) {
    return (
      <div className="container-page py-16">
        <ErrorState message="The trip dates are missing or invalid. Please choose your dates on the camper page." />
      </div>
    )
  }

  const applyCoupon = () => {
    const parsed = couponSchema.safeParse(couponInput)
    if (!parsed.success) {
      setCouponError(parsed.error.issues[0]?.message ?? 'Invalid coupon')
      return
    }
    setCouponError(null)
    setAppliedCoupon(parsed.data || undefined)
  }

  const onSubmit = async (values: DriverValues) => {
    setFormError(null)
    const result = await dispatch(
      createBooking({
        camperId,
        startDate,
        endDate,
        extras,
        couponCode: appliedCoupon,
        driver: {
          fullName: values.fullName,
          phone: normalizePhone(values.phone),
          licenseNumber: values.licenseNumber || undefined,
        },
        customerNote: values.customerNote || undefined,
      }),
    )
    if (createBooking.fulfilled.match(result)) {
      dispatch(showToast(`Booking ${result.payload.bookingNumber} created — complete the payment to confirm it.`))
      navigate(ROUTES.booking(result.payload._id), { replace: true, state: { justCreated: true } })
    } else if (result.payload) {
      if (!applyServerFieldErrors(result.payload.fieldErrors, DRIVER_FIELDS, setError)) setFormError(result.payload.message)
    }
  }

  const unavailable = quote.quote ? !quote.quote.available : false
  const canSubmit = quote.status === 'succeeded' && !unavailable

  return (
    <div className="container-page py-10 md:py-14">
      <Link to={camper ? ROUTES.camper(camper.slug) : ROUTES.campers} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to camper
      </Link>
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">Complete your booking</h1>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 rounded-[20px] bg-white p-6 shadow-card md:p-8" aria-label="Driver details">
          <div>
            <h2 className="text-2xl font-semibold">Driver details</h2>
            <p className="mt-1 text-sm text-muted">The main driver must bring a valid licence for this camper at pickup.</p>
          </div>
          <FormField label="Full name" error={errors.fullName?.message}>
            <TextInput autoComplete="name" {...register('fullName')} />
          </FormField>
          <FormField label="Mobile Phone Number" error={errors.phone?.message}>
            <TextInput type="tel" autoComplete="tel" placeholder="010-1234-5678" {...register('phone')} />
          </FormField>
          <FormField label="Driver’s licence number" optional error={errors.licenseNumber?.message}>
            <TextInput autoComplete="off" {...register('licenseNumber')} />
          </FormField>
          <FormField label="Notes for our team" optional error={errors.customerNote?.message}>
            <TextArea rows={3} placeholder="Arrival time, questions, special requests…" {...register('customerNote')} />
          </FormField>
          {formError && <p role="alert" className="rounded-xl bg-[#fff6f6] px-3 py-2 text-sm font-medium text-danger">{formError}</p>}
          <Button type="submit" size="lg" block loading={isSubmitting} disabled={!canSubmit}>
            Continue to payment
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Lock className="size-3.5" aria-hidden />
            Your dates are held{settings ? ` for ${settings.bookingHoldMinutes} minutes` : ''} after this step while you pay.
          </p>
        </form>

        <aside className="space-y-5 rounded-[20px] bg-white p-6 shadow-card lg:sticky lg:top-[118px]" aria-label="Trip summary">
          {camper ? (
            <div className="flex gap-4">
              <CamperImage src={coverImage(camper)} alt="" className="h-20 w-28 shrink-0 bg-surface" />
              <div className="min-w-0">
                <p className="truncate font-semibold">{camper.name}</p>
                <p className="text-xs text-muted">{camper.category.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs">
                  <CalendarDays className="size-3.5 text-brand" aria-hidden /> {formatDate(startDate)} → {formatDate(endDate)}
                </p>
              </div>
            </div>
          ) : request?.status === 'failed' ? (
            <p className="text-sm text-danger">{request.error}</p>
          ) : (
            <Skeleton className="h-20 w-full" />
          )}

          <div>
            <label htmlFor="coupon" className="flex items-center gap-1 text-sm font-medium"><Tag className="size-4" aria-hidden /> Coupon code</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="e.g. WELCOME10"
                className="field-input h-10 py-0 uppercase"
                aria-invalid={couponError ? true : undefined}
              />
              <Button variant="outline" size="sm" className="h-10" onClick={applyCoupon} disabled={!couponInput.trim()}>
                Apply
              </Button>
            </div>
            {couponError && <p role="alert" className="mt-1 text-xs text-danger">{couponError}</p>}
            {appliedCoupon && quote.status === 'succeeded' && <p className="mt-1 text-xs text-success">Coupon {appliedCoupon} applied.</p>}
          </div>

          <div aria-live="polite">
            {quote.status === 'failed' && !appliedCoupon ? (
              <p role="alert" className="text-sm font-medium text-danger">{quote.error}</p>
            ) : quote.status !== 'succeeded' || !quote.quote ? (
              <div className="space-y-2"><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-2/3" /><div className="skeleton h-5 w-1/2" /></div>
            ) : (
              <>
                {unavailable && (
                  <div role="alert" className="mb-3 rounded-xl bg-[#fff6f6] p-3 text-sm text-danger">
                    These dates were just booked by someone else.{' '}
                    {camper && <ButtonLink to={ROUTES.camper(camper.slug)} variant="ghost" size="sm">Choose other dates</ButtonLink>}
                  </div>
                )}
                <p className="mb-2 text-xs text-muted">{pluralize(quote.quote.price.nights, 'night')}</p>
                <PriceBreakdownList price={quote.quote.price} />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
