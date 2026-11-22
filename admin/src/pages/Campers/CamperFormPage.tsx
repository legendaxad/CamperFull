import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useFieldArray, useForm, type FieldErrors, type UseFormRegisterReturn } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toastContext'
import { describeError } from '@/services/errors'
import { useCamperQuery, useCategoriesQuery, useCreateCamperMutation, useFeaturesQuery, useUpdateCamperMutation } from '@/services/endpoints'
import { CAMPER_STATUSES, FUEL_TYPES, LICENSE_TYPES, TRANSMISSIONS, type Camper } from '@/types/api'
import { humanize } from '@/utils/format'
import { CAMPER_STATUS_META, LICENSE_LABELS } from '@/utils/status'
import { camperFormSchema, camperToForm, emptyCamperForm, formToCamperInput, type CamperFormValues } from './camperFormSchema'

export default function CamperFormPage() {
  const { id } = useParams()
  const camper = useCamperQuery(id ?? '', { skip: !id })
  if (id && camper.isLoading) return <Skeleton className="h-[70vh]" />
  if (id && (camper.error || !camper.data)) {
    return (
      <Card>
        <ErrorState error={camper.error} onRetry={camper.refetch} />
      </Card>
    )
  }
  return <CamperForm camper={camper.data} />
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">{children}</div>
    </Card>
  )
}

/** Text/number input bound to react-hook-form with label + error. */
function TextField({ label, registration, error, required, hint, type = 'text', inputMode, className, suffix }: {
  label: string
  registration: UseFormRegisterReturn
  error?: string
  required?: boolean
  hint?: string
  type?: string
  inputMode?: 'numeric' | 'text'
  className?: string
  suffix?: string
}) {
  return (
    <Field label={label} error={error} required={required} hint={hint} className={className}>
      {(fieldId, describedBy) => (
        <div className="relative">
          <Input id={fieldId} aria-describedby={describedBy} type={type} inputMode={inputMode} invalid={Boolean(error)} className={suffix ? 'pr-12' : undefined} {...registration} />
          {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-fg-3">{suffix}</span>}
        </div>
      )}
    </Field>
  )
}

function firstErrorMessages(errors: FieldErrors<CamperFormValues>): number {
  return Object.keys(errors).length
}

function CamperForm({ camper }: { camper?: Camper }) {
  const editing = Boolean(camper)
  const navigate = useNavigate()
  const toast = useToast()
  const categories = useCategoriesQuery()
  const features = useFeaturesQuery()
  const [createCamper, { isLoading: creating }] = useCreateCamperMutation()
  const [updateCamper, { isLoading: updating }] = useUpdateCamperMutation()
  const [serverError, setServerError] = useState<unknown>(null)

  const { register, handleSubmit, control, formState, watch, setValue } = useForm<CamperFormValues>({
    resolver: zodResolver(camperFormSchema),
    defaultValues: camper ? camperToForm(camper) : emptyCamperForm(),
    mode: 'onTouched',
  })
  const extras = useFieldArray({ control, name: 'extras' })
  const highlights = useFieldArray({ control, name: 'highlights' })
  const errors = formState.errors
  const selectedFeatures = watch('features')

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!formState.isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [formState.isDirty])

  const onSubmit = handleSubmit(
    async (values) => {
      setServerError(null)
      const body = formToCamperInput(values, editing)
      try {
        const saved = camper ? await updateCamper({ id: camper._id, body }).unwrap() : await createCamper(body).unwrap()
        toast.success(camper ? 'Changes saved.' : `${saved.name} was added. Now upload some photos.`)
        navigate(`/campers/${saved._id}`, { replace: !camper })
      } catch (error) {
        setServerError(error)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    () => toast.error('Please fix the highlighted fields.'),
  )

  const groupedFeatures = (features.data ?? []).filter((feature) => feature.isActive || selectedFeatures.includes(feature._id))
  const title = camper ? `Edit ${camper.name}` : 'Add camper'

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: 'Fleet', to: '/campers' }, ...(camper ? [{ label: camper.name, to: `/campers/${camper._id}` }] : []), { label: camper ? 'Edit' : 'New' }]}
        description={camper ? undefined : 'Photos can be uploaded once the camper is created.'}
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {serverError !== null && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger" role="alert">
            <p className="font-medium">{describeError(serverError)}</p>
            {typeof serverError === 'object' && serverError && 'fieldErrors' in serverError && Array.isArray(serverError.fieldErrors) && serverError.fieldErrors.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5">
                {(serverError.fieldErrors as { field?: string; message: string }[]).map((detail, index) => (
                  <li key={index}>
                    {detail.field ? `${detail.field.replace(/^body\./, '')}: ` : ''}
                    {detail.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="flex flex-col gap-6 xl:col-span-2">
            <Section title="Basics">
              <TextField label="Name" required registration={register('name')} error={errors.name?.message} className="sm:col-span-2" />
              <Field label="Category" required error={errors.category?.message}>
                {(fieldId, describedBy) => (
                  <Select id={fieldId} aria-describedby={describedBy} invalid={Boolean(errors.category)} {...register('category')}>
                    <option value="">{categories.isLoading ? 'Loading…' : 'Choose a category'}</option>
                    {categories.data?.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.name}
                        {category.isActive ? '' : ' (inactive)'}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Driving licence" required>
                {(fieldId) => (
                  <Select id={fieldId} {...register('licenseType')}>
                    {LICENSE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {LICENSE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <TextField label="Brand" registration={register('brand')} error={errors.brand?.message} />
              <TextField label="Rental company" registration={register('company')} error={errors.company?.message} />
              <TextField label="Base vehicle" registration={register('baseVehicle')} error={errors.baseVehicle?.message} hint="e.g. Hyundai Solati" />
              <TextField label="Model year" inputMode="numeric" registration={register('modelYear')} error={errors.modelYear?.message} />
              <Field label="Description" required error={errors.description?.message} className="sm:col-span-2">
                {(fieldId, describedBy) => <Textarea id={fieldId} aria-describedby={describedBy} rows={6} invalid={Boolean(errors.description)} {...register('description')} />}
              </Field>
            </Section>

            <Section title="Capacity & specifications">
              <TextField label="Seats" required inputMode="numeric" registration={register('seats')} error={errors.seats?.message} />
              <TextField label="Berths (sleeps)" required inputMode="numeric" registration={register('sleeps')} error={errors.sleeps?.message} />
              <Field label="Fuel">
                {(fieldId) => (
                  <Select id={fieldId} {...register('fuelType')}>
                    {FUEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {humanize(type)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Transmission">
                {(fieldId) => (
                  <Select id={fieldId} {...register('transmission')}>
                    {TRANSMISSIONS.map((type) => (
                      <option key={type} value={type}>
                        {humanize(type)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <TextField label="Engine" registration={register('engine')} error={errors.engine?.message} hint="e.g. 2.2 diesel, 170 hp" />
              <TextField label="Mileage" inputMode="numeric" suffix="km" registration={register('mileageKm')} error={errors.mileageKm?.message} />
              <TextField label="Length" inputMode="numeric" suffix="mm" registration={register('lengthMm')} error={errors.lengthMm?.message} />
              <TextField label="Width" inputMode="numeric" suffix="mm" registration={register('widthMm')} error={errors.widthMm?.message} />
              <TextField label="Height" inputMode="numeric" suffix="mm" registration={register('heightMm')} error={errors.heightMm?.message} />
              <TextField label="Weight" inputMode="numeric" suffix="kg" registration={register('weightKg')} error={errors.weightKg?.message} />
            </Section>

            <Section title="Pickup location">
              <TextField label="Region" required registration={register('region')} error={errors.region?.message} hint="Used for catalog filters, e.g. Gyeonggi" />
              <TextField label="City" registration={register('city')} error={errors.city?.message} />
              <TextField label="Address" registration={register('address')} error={errors.address?.message} className="sm:col-span-2" />
              <Field label="Pickup notes" error={errors.pickupNotes?.message} className="sm:col-span-2">
                {(fieldId) => <Textarea id={fieldId} rows={3} {...register('pickupNotes')} />}
              </Field>
            </Section>

            <Card>
              <CardHeader
                title="Highlights"
                description="Short selling points shown on the camper page (up to 10)"
                action={
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} disabled={highlights.fields.length >= 10} onClick={() => highlights.append({ title: '', description: '' })}>
                    Add highlight
                  </Button>
                }
              />
              <div className="flex flex-col gap-4 px-5 pb-5">
                {highlights.fields.length === 0 && <p className="text-[13px] text-fg-3">No highlights yet.</p>}
                {highlights.fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_auto]">
                    <div className="flex flex-col gap-3">
                      <TextField label="Title" registration={register(`highlights.${index}.title`)} error={errors.highlights?.[index]?.title?.message} />
                      <Field label="Description" error={errors.highlights?.[index]?.description?.message}>
                        {(fieldId) => <Textarea id={fieldId} rows={2} {...register(`highlights.${index}.description`)} />}
                      </Field>
                    </div>
                    <Button size="icon-sm" variant="ghost" className="text-danger" onClick={() => highlights.remove(index)} aria-label={`Remove highlight ${index + 1}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Features" description="Amenities customers can filter by" />
              <div className="px-5 pb-5">
                {features.isLoading ? (
                  <Skeleton className="h-16" />
                ) : groupedFeatures.length === 0 ? (
                  <p className="text-[13px] text-fg-3">No features are defined yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groupedFeatures.map((feature) => {
                      const checked = selectedFeatures.includes(feature._id)
                      return (
                        <label
                          key={feature._id}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                            checked ? 'border-accent/50 bg-accent-soft text-accent-ink' : 'border-line text-fg-2 hover:border-line-strong'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) =>
                              setValue('features', e.target.checked ? [...selectedFeatures, feature._id] : selectedFeatures.filter((value) => value !== feature._id), { shouldDirty: true })
                            }
                          />
                          {feature.name}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Pricing" description="Whole KRW. Existing bookings keep their original price." />
              <div className="flex flex-col gap-4 px-5 pb-5">
                <TextField label="Daily rate" required inputMode="numeric" suffix="KRW" registration={register('dailyRate')} error={errors.dailyRate?.message} />
                <TextField label="Weekend rate" inputMode="numeric" suffix="KRW" registration={register('weekendDailyRate')} error={errors.weekendDailyRate?.message} hint="Fri & Sat nights. Empty = daily rate." />
                <TextField label="Cleaning fee" inputMode="numeric" suffix="KRW" registration={register('cleaningFee')} error={errors.cleaningFee?.message} />
                <TextField label="Security deposit" inputMode="numeric" suffix="KRW" registration={register('securityDeposit')} error={errors.securityDeposit?.message} hint="Collected at pickup, not online." />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Min nights" required inputMode="numeric" registration={register('minNights')} error={errors.minNights?.message} />
                  <TextField label="Max nights" required inputMode="numeric" registration={register('maxNights')} error={errors.maxNights?.message} />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="Visibility" />
              <div className="flex flex-col gap-4 px-5 pb-5">
                <Field label="Status">
                  {(fieldId) => (
                    <Select id={fieldId} {...register('status')}>
                      {CAMPER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {CAMPER_STATUS_META[status].label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Checkbox label="Featured" description="Shown first on the customer home page." {...register('isFeatured')} />
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Extras"
                description="Optional add-ons"
                action={
                  <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} disabled={extras.fields.length >= 30} onClick={() => extras.append({ name: '', price: '', chargeType: 'PER_BOOKING', maxQuantity: '1' })}>
                    Add
                  </Button>
                }
              />
              <div className="flex flex-col gap-3 px-5 pb-5">
                {extras.fields.length === 0 && <p className="text-[13px] text-fg-3">No extras.</p>}
                {extras.fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-3 rounded-xl border border-line p-3">
                    <div className="flex items-end gap-2">
                      <TextField label="Name" registration={register(`extras.${index}.name`)} error={errors.extras?.[index]?.name?.message} className="flex-1" />
                      <Button size="icon" variant="ghost" className="text-danger" onClick={() => extras.remove(index)} aria-label={`Remove extra ${index + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <TextField label="Price" inputMode="numeric" registration={register(`extras.${index}.price`)} error={errors.extras?.[index]?.price?.message} />
                      <Field label="Charged">
                        {(fieldId) => (
                          <Select id={fieldId} {...register(`extras.${index}.chargeType`)}>
                            <option value="PER_BOOKING">Per booking</option>
                            <option value="PER_NIGHT">Per night</option>
                          </Select>
                        )}
                      </Field>
                      <TextField label="Max qty" inputMode="numeric" registration={register(`extras.${index}.maxQuantity`)} error={errors.extras?.[index]?.maxQuantity?.message} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 -mb-12 border-t border-line bg-canvas/90 backdrop-blur-md sm:-mx-6 lg:-mx-8">
          <div className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8">
            {firstErrorMessages(errors) > 0 && <p className="mr-auto text-[13px] text-danger">Some fields need attention.</p>}
            <Button variant="ghost" onClick={() => navigate(camper ? `/campers/${camper._id}` : '/campers')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={creating || updating}>
              {camper ? 'Save changes' : 'Create camper'}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
