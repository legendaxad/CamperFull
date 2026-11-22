import { zodResolver } from '@hookform/resolvers/zod'
import { nanoid } from '@reduxjs/toolkit'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { FormField, Select, TextInput } from '@/components/forms/FormField'
import { pricingSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData } from '@/features/publishing/publishingSelectors'
import type { PricingDraft, PricingValues } from '@/features/publishing/publishingTypes'
import type { CamperPricing } from '@/types/camper'
import { addDaysISO, todayISO } from '@/utils/dates'
import { formatPrice } from '@/utils/format'
import { quoteRental } from '@/utils/pricing'
import { sameShape, useAutosaveSection, useWizardNavigation } from '../useWizardStep'
import { StepForm, StepSubheading } from './StepForm'

const MAX_FEES = 6
const num = (value: string) => (value.trim() === '' || Number.isNaN(Number(value)) ? 0 : Number(value))

/** Lenient conversion for the live example only (validation happens on submit). */
function previewPricing(values: PricingDraft): CamperPricing {
  return {
    dailyPrice: num(values.dailyPrice),
    weeklyDiscountPct: num(values.weeklyDiscountPct),
    monthlyDiscountPct: num(values.monthlyDiscountPct),
    securityDeposit: num(values.securityDeposit),
    minRentalDays: num(values.minRentalDays),
    availableFrom: values.availableFrom,
    availableTo: values.availableTo,
    additionalFees: values.additionalFees.map((f) => ({ ...f, amount: num(f.amount) })),
  }
}

export function PricingStep() {
  const draft = useAppSelector(selectSessionData)!
  const { next } = useWizardNavigation()
  const form = useForm<PricingDraft, unknown, PricingValues>({
    resolver: zodResolver(pricingSchema),
    defaultValues: draft.pricing,
    mode: 'onTouched',
  })
  useAutosaveSection('pricing', form, sameShape)
  const { register, control, watch, formState: { errors } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'additionalFees' })
  const values = watch()
  const pricing = previewPricing(values)
  const examples = [3, 7, 30].map((nights) => ({ nights, quote: quoteRental(pricing, nights) }))

  return (
    <StepForm onSubmit={form.handleSubmit(next)}>
      <StepSubheading>Rates</StepSubheading>
      <FormField label="Daily rental price" error={errors.dailyPrice?.message} suffix="₩ / day">
        <TextInput type="number" inputMode="numeric" min={0} step={1000} placeholder="180000" {...register('dailyPrice')} />
      </FormField>
      <FormField label="Security deposit" error={errors.securityDeposit?.message} suffix="₩" optional hint="Refundable after the trip.">
        <TextInput type="number" inputMode="decimal" min={0} placeholder="300000" {...register('securityDeposit')} />
      </FormField>
      <FormField label="Weekly discount" error={errors.weeklyDiscountPct?.message} suffix="%" optional hint="Applied to stays of 7+ nights.">
        <TextInput type="number" inputMode="decimal" min={0} max={90} placeholder="10" {...register('weeklyDiscountPct')} />
      </FormField>
      <FormField label="Monthly discount" error={errors.monthlyDiscountPct?.message} suffix="%" optional hint="Applied to stays of 28+ nights.">
        <TextInput type="number" inputMode="decimal" min={0} max={90} placeholder="20" {...register('monthlyDiscountPct')} />
      </FormField>

      <StepSubheading>Availability</StepSubheading>
      <FormField label="Available from" error={errors.availableFrom?.message}>
        <TextInput type="date" min={todayISO()} {...register('availableFrom')} />
      </FormField>
      <FormField label="Available until" error={errors.availableTo?.message}>
        <TextInput type="date" min={addDaysISO(values.availableFrom || todayISO(), 1)} {...register('availableTo')} />
      </FormField>
      <FormField label="Minimum rental duration" error={errors.minRentalDays?.message} suffix="nights">
        <TextInput type="number" inputMode="numeric" min={1} max={60} {...register('minRentalDays')} />
      </FormField>

      <StepSubheading>Additional fees</StepSubheading>
      <div className="space-y-3 sm:col-span-2">
        {fields.length === 0 && <p className="text-sm text-muted">No extra fees — e.g. final cleaning, pet fee or bedding set.</p>}
        {fields.map((field, index) => {
          const feeErrors = errors.additionalFees?.[index]
          return (
            <div key={field.id} className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-[16px] bg-surface p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <FormField label="Fee name" error={feeErrors?.label?.message} className="col-span-2 sm:col-span-1">
                <TextInput placeholder="Final cleaning" {...register(`additionalFees.${index}.label`)} />
              </FormField>
              <FormField label="Amount" error={feeErrors?.amount?.message} suffix="₩">
                <TextInput type="number" inputMode="decimal" min={0} placeholder="50000" {...register(`additionalFees.${index}.amount`)} />
              </FormField>
              <FormField label="Charged">
                <Select {...register(`additionalFees.${index}.per`)}>
                  <option value="stay">Per stay</option>
                  <option value="day">Per day</option>
                </Select>
              </FormField>
              <button type="button" onClick={() => remove(index)} className="mt-7 rounded-lg p-2.5 text-danger hover:bg-white" aria-label={`Remove fee ${index + 1}`}>
                <Trash2 className="size-5" />
              </button>
            </div>
          )
        })}
        {errors.additionalFees?.message && <p className="text-xs text-danger">{errors.additionalFees.message}</p>}
        <Button
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_FEES}
          onClick={() => append({ id: `fee-${nanoid(6)}`, label: '', amount: '', per: 'stay' })}
          icon={<Plus className="size-4" aria-hidden />}
        >
          Add fee
        </Button>
      </div>

      <div className="rounded-[16px] bg-brand-soft p-4 sm:col-span-2" aria-live="polite">
        <p className="text-sm font-semibold text-brand">What travellers will pay</p>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {examples.map(({ nights, quote }) => (
            <div key={nights} className="rounded-xl bg-white p-3 shadow-card">
              <p className="text-xs text-muted">{nights} nights</p>
              <p className="mt-1 text-lg font-bold">{formatPrice(quote.total)}</p>
              {quote.discountPct > 0 && <p className="text-[11px] font-semibold text-success">−{quote.discountPct}%</p>}
            </div>
          ))}
        </div>
      </div>
    </StepForm>
  )
}
