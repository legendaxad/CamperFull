import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useAppSelector } from '@/app/hooks'
import { FormField, Select, TextArea, TextInput } from '@/components/forms/FormField'
import { CAMPER_CATEGORIES, CAMPER_TYPE_LABELS, CAMPER_TYPES, CATEGORY_LABELS } from '@/constants/camper'
import { basicsSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData } from '@/features/publishing/publishingSelectors'
import type { BasicsDraft, BasicsValues } from '@/features/publishing/publishingTypes'
import { sameShape, useAutosaveSection, useWizardNavigation } from '../useWizardStep'
import { StepForm } from './StepForm'

const DESCRIPTION_MAX = 2000

export function BasicsStep() {
  const draft = useAppSelector(selectSessionData)!
  const { next } = useWizardNavigation()
  const form = useForm<BasicsDraft, unknown, BasicsValues>({
    resolver: zodResolver(basicsSchema),
    defaultValues: draft.basics,
    mode: 'onTouched',
  })
  useAutosaveSection('basics', form, sameShape)
  const { register, formState: { errors }, watch } = form
  const descriptionLength = watch('description').length

  return (
    <StepForm onSubmit={form.handleSubmit(next)}>
      <FormField label="Camper title" error={errors.title?.message} hint="e.g. “Family motorhome with solar & bike rack”" className="sm:col-span-2">
        <TextInput placeholder="Give your camper a catchy name" maxLength={80} {...register('title')} />
      </FormField>
      <FormField label="Brand" error={errors.brand?.message}>
        <TextInput placeholder="e.g. Knaus" autoComplete="off" {...register('brand')} />
      </FormField>
      <FormField label="Model" error={errors.model?.message}>
        <TextInput placeholder="e.g. Sky TI 650 MEG" autoComplete="off" {...register('model')} />
      </FormField>
      <FormField label="Manufacturing year" error={errors.year?.message}>
        <TextInput type="number" inputMode="numeric" placeholder="2022" {...register('year')} />
      </FormField>
      <FormField label="Camper type" error={errors.type?.message}>
        <Select {...register('type')}>
          {CAMPER_TYPES.map((type) => (
            <option key={type} value={type}>{CAMPER_TYPE_LABELS[type]}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Marketplace section" error={errors.category?.message} hint="Where travellers will find your listing.">
        <Select {...register('category')}>
          {CAMPER_CATEGORIES.map((category) => (
            <option key={category} value={category}>{CATEGORY_LABELS[category].plural}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Passengers" error={errors.passengers?.message}>
          <TextInput type="number" inputMode="numeric" min={1} max={12} placeholder="4" {...register('passengers')} />
        </FormField>
        <FormField label="Sleeping places" error={errors.sleepingPlaces?.message}>
          <TextInput type="number" inputMode="numeric" min={1} max={10} placeholder="4" {...register('sleepingPlaces')} />
        </FormField>
      </div>
      <FormField
        label="Description"
        error={errors.description?.message}
        hint={`${descriptionLength}/${DESCRIPTION_MAX} · Describe the layout, highlights and what makes trips special.`}
        className="sm:col-span-2"
      >
        <TextArea rows={6} maxLength={DESCRIPTION_MAX} placeholder="Spacious lounge, fully equipped kitchen, perfect for families…" {...register('description')} />
      </FormField>
    </StepForm>
  )
}
