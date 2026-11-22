import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useAppSelector } from '@/app/hooks'
import { FormField, Select, TextInput } from '@/components/forms/FormField'
import { CONDITIONS, FUEL_LABELS, FUEL_TYPES, TRANSMISSIONS } from '@/constants/camper'
import { specsSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData } from '@/features/publishing/publishingSelectors'
import type { SpecsDraft, SpecsValues } from '@/features/publishing/publishingTypes'
import { cn } from '@/utils/cn'
import { sameShape, useAutosaveSection, useWizardNavigation } from '../useWizardStep'
import { StepForm, StepSubheading } from './StepForm'

export function SpecsStep() {
  const draft = useAppSelector(selectSessionData)!
  const { next } = useWizardNavigation()
  const form = useForm<SpecsDraft, unknown, SpecsValues>({
    resolver: zodResolver(specsSchema),
    defaultValues: draft.specs,
    mode: 'onTouched',
  })
  useAutosaveSection('specs', form, sameShape)
  const { register, formState: { errors }, watch } = form
  const transmission = watch('transmission')

  return (
    <StepForm onSubmit={form.handleSubmit(next)}>
      <StepSubheading>Dimensions</StepSubheading>
      <div className="grid grid-cols-3 gap-3 sm:col-span-2">
        <FormField label="Length" error={errors.lengthM?.message} suffix="m">
          <TextInput type="number" inputMode="decimal" step="0.01" placeholder="6.99" {...register('lengthM')} />
        </FormField>
        <FormField label="Width" error={errors.widthM?.message} suffix="m">
          <TextInput type="number" inputMode="decimal" step="0.01" placeholder="2.32" {...register('widthM')} />
        </FormField>
        <FormField label="Height" error={errors.heightM?.message} suffix="m">
          <TextInput type="number" inputMode="decimal" step="0.01" placeholder="2.94" {...register('heightM')} />
        </FormField>
      </div>
      <FormField label="Weight (gross)" error={errors.weightKg?.message} suffix="kg" hint="Up to 3,500 kg can be driven with a standard licence.">
        <TextInput type="number" inputMode="numeric" placeholder="3500" {...register('weightKg')} />
      </FormField>
      <FormField label="Mileage" error={errors.mileageKm?.message} suffix="km">
        <TextInput type="number" inputMode="numeric" placeholder="24000" {...register('mileageKm')} />
      </FormField>

      <StepSubheading>Drivetrain</StepSubheading>
      <FormField label="Engine type" error={errors.engineType?.message}>
        <TextInput placeholder="e.g. 2.3L Multijet 140 hp" {...register('engineType')} />
      </FormField>
      <FormField label="Fuel type" error={errors.fuelType?.message}>
        <Select {...register('fuelType')}>
          {FUEL_TYPES.map((fuel) => (
            <option key={fuel} value={fuel}>{FUEL_LABELS[fuel]}</option>
          ))}
        </Select>
      </FormField>
      <fieldset className="sm:col-span-1">
        <legend className="px-1 pb-1.5 text-sm font-medium">Transmission</legend>
        <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-field p-1">
          {TRANSMISSIONS.map((value) => (
            <label
              key={value}
              className={cn(
                'cursor-pointer rounded-[10px] py-2.5 text-center text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                transmission === value ? 'bg-white text-brand shadow-card' : 'text-muted hover:text-ink',
              )}
            >
              <input type="radio" value={value} className="sr-only" {...register('transmission')} />
              {value === 'manual' ? 'Manual' : 'Automatic'}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField label="Condition" error={errors.condition?.message}>
        <Select {...register('condition')}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c === 'new' ? 'New' : 'Used'}</option>
          ))}
        </Select>
      </FormField>

      <StepSubheading>Registration</StepSubheading>
      <FormField label="Registration number" error={errors.registrationNumber?.message} hint="Shown only to confirmed travellers.">
        <TextInput placeholder="12가 3456" autoComplete="off" {...register('registrationNumber')} />
      </FormField>
      <FormField label="Registration country" error={errors.registrationCountry?.message}>
        <TextInput placeholder="South Korea" autoComplete="country-name" {...register('registrationCountry')} />
      </FormField>
    </StepForm>
  )
}
