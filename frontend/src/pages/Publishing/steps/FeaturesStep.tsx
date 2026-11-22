import { zodResolver } from '@hookform/resolvers/zod'
import { Check } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAppSelector } from '@/app/hooks'
import { FEATURE_KEYS, FEATURES } from '@/constants/camper'
import { featuresSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData } from '@/features/publishing/publishingSelectors'
import type { FeaturesDraft, FeaturesValues } from '@/features/publishing/publishingTypes'
import { cn } from '@/utils/cn'
import { useAutosaveSection, useWizardNavigation } from '../useWizardStep'
import { STEP_FORM_ID } from '../wizardConfig'

const toDraft = (values: FeaturesDraft) => values.features

/** Selectable feature cards — checkboxes styled as tiles for a friendlier experience. */
export function FeaturesStep() {
  const draft = useAppSelector(selectSessionData)!
  const { next } = useWizardNavigation()
  const form = useForm<FeaturesDraft, unknown, FeaturesValues>({
    resolver: zodResolver(featuresSchema),
    defaultValues: { features: draft.features },
  })
  useAutosaveSection('features', form, toDraft)
  const { register, watch, setValue, formState: { errors } } = form
  const selected = watch('features')
  const allSelected = selected.length === FEATURE_KEYS.length

  return (
    <form id={STEP_FORM_ID} onSubmit={form.handleSubmit(next)} noValidate>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          <strong className="text-ink">{selected.length}</strong> of {FEATURE_KEYS.length} selected
        </p>
        <button
          type="button"
          onClick={() => setValue('features', allSelected ? [] : [...FEATURE_KEYS], { shouldValidate: true })}
          className="text-sm font-semibold text-brand hover:underline"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <fieldset>
        <legend className="sr-only">Equipment and features</legend>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {FEATURE_KEYS.map((key) => {
            const { icon: Icon, label, hint } = FEATURES[key]
            const checked = selected.includes(key)
            return (
              <label
                key={key}
                className={cn(
                  'relative flex cursor-pointer flex-col gap-2 rounded-[16px] border-2 bg-white p-4 transition select-none',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2',
                  checked ? 'border-brand bg-brand-soft/60 shadow-card' : 'border-line hover:border-brand/40',
                )}
              >
                <input type="checkbox" value={key} className="sr-only" {...register('features')} />
                <span className={cn('flex size-11 items-center justify-center rounded-xl transition', checked ? 'bg-brand text-white' : 'bg-surface text-brand')}>
                  <Icon className="size-[22px]" aria-hidden />
                </span>
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className="text-xs text-muted">{hint}</span>
                <span
                  className={cn(
                    'absolute top-3 right-3 flex size-5 items-center justify-center rounded-full border-2 transition',
                    checked ? 'border-brand bg-brand text-white' : 'border-line',
                  )}
                  aria-hidden
                >
                  {checked && <Check className="size-3" strokeWidth={3} />}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      {errors.features && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">{errors.features.message}</p>
      )}
    </form>
  )
}
