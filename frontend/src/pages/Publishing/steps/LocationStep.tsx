import { zodResolver } from '@hookform/resolvers/zod'
import { Crosshair, Loader2, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { FormField, TextInput } from '@/components/forms/FormField'
import { locationSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData } from '@/features/publishing/publishingSelectors'
import type { LocationDraft, LocationValues } from '@/features/publishing/publishingTypes'
import { sameShape, useAutosaveSection, useWizardNavigation } from '../useWizardStep'
import { StepForm } from './StepForm'

const COUNTRIES = ['South Korea', 'Japan', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'United Kingdom', 'United States', 'Canada', 'Australia', 'New Zealand']

/**
 * Pickup location. Coordinates are optional and captured from the browser's
 * Geolocation API — the field is ready for a future map / geocoding integration.
 */
export function LocationStep() {
  const draft = useAppSelector(selectSessionData)!
  const { next } = useWizardNavigation()
  const form = useForm<LocationDraft, unknown, LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: draft.location,
    mode: 'onTouched',
  })
  useAutosaveSection('location', form, sameShape)
  const { register, setValue, watch, formState: { errors } } = form
  const coordinates = watch('coordinates')
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'error'>('idle')
  const [geoError, setGeoError] = useState<string | null>(null)

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error')
      setGeoError('Your browser does not support location access.')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setValue('coordinates', { lat: Number(coords.latitude.toFixed(5)), lng: Number(coords.longitude.toFixed(5)) }, { shouldDirty: true })
        setGeoStatus('idle')
        setGeoError(null)
      },
      (error) => {
        setGeoStatus('error')
        setGeoError(error.code === error.PERMISSION_DENIED ? 'Location permission was denied.' : 'We could not determine your location.')
      },
      { timeout: 10_000 },
    )
  }

  return (
    <StepForm onSubmit={form.handleSubmit(next)}>
      <FormField label="Country" error={errors.country?.message}>
        <TextInput list="country-options" autoComplete="country-name" placeholder="South Korea" {...register('country')} />
      </FormField>
      <datalist id="country-options">
        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </datalist>
      <FormField label="City" error={errors.city?.message}>
        <TextInput autoComplete="address-level2" placeholder="Seoul" {...register('city')} />
      </FormField>
      <FormField label="Address or pickup location" error={errors.address?.message} className="sm:col-span-2" hint="The exact address is shared after a booking is confirmed.">
        <TextInput autoComplete="street-address" placeholder="10 Camper-ro, Mapo-gu" {...register('address')} />
      </FormField>
      <FormField label="Postal code" error={errors.postalCode?.message}>
        <TextInput autoComplete="postal-code" placeholder="04001" {...register('postalCode')} />
      </FormField>

      <div className="rounded-[16px] border border-line bg-surface p-4 sm:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-white text-brand shadow-card">
              <MapPin className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">Map pin <span className="font-normal text-muted">(optional)</span></p>
              <p className="text-xs text-muted" aria-live="polite">
                {coordinates
                  ? `Saved: ${coordinates.lat}, ${coordinates.lng}`
                  : 'Share your current position to help travellers find the pickup spot.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {coordinates && (
              <Button variant="ghost" size="sm" onClick={() => setValue('coordinates', null, { shouldDirty: true })} icon={<X className="size-4" aria-hidden />}>
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={locate} disabled={geoStatus === 'locating'} icon={geoStatus === 'locating' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}>
              Use my location
            </Button>
          </div>
        </div>
        {geoError && <p role="alert" className="mt-2 text-xs text-danger">{geoError}</p>}
      </div>
    </StepForm>
  )
}
