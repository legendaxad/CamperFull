import { AlertCircle, CheckCircle2, MapPin, PencilLine, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAppSelector } from '@/app/hooks'
import { CamperGallery } from '@/components/camper/CamperGallery'
import { LocalFeatureList, LocalOnlyNotice } from '@/components/publishing/LocalListing'
import { Badge } from '@/components/common/Feedback'
import { CAMPER_TYPE_LABELS, CATEGORY_LABELS, FUEL_LABELS } from '@/constants/camper'
import { listingDraftSchema } from '@/features/publishing/publishingSchemas'
import { selectSessionData, selectStepValidity } from '@/features/publishing/publishingSelectors'
import type { WizardStepId } from '@/features/publishing/publishingTypes'
import { cn } from '@/utils/cn'
import { formatDate, formatPrice } from '@/utils/format'
import { useWizardNavigation } from '../useWizardStep'
import { STEP_FORM_ID, WIZARD_STEPS } from '../wizardConfig'

const show = (value: string | number | undefined | null, suffix = '') =>
  value === '' || value === undefined || value === null ? <span className="text-danger/80">Missing</span> : `${value}${suffix}`

function Section({ step, children }: { step: WizardStepId; children: ReactNode }) {
  const validity = useAppSelector(selectStepValidity)
  const { goTo } = useWizardNavigation()
  const index = WIZARD_STEPS.findIndex((s) => s.id === step)
  const meta = WIZARD_STEPS[index]!
  const valid = validity[step]
  return (
    <section className="rounded-[16px] border border-line bg-white p-5" aria-labelledby={`preview-${step}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id={`preview-${step}`} className="flex items-center gap-2 text-base font-semibold">
          {valid ? (
            <CheckCircle2 className="size-5 text-success" aria-label="Complete" />
          ) : (
            <AlertCircle className="size-5 text-danger" aria-label="Needs attention" />
          )}
          {meta.title}
        </h3>
        <button
          type="button"
          onClick={() => goTo(index)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          <PencilLine className="size-4" aria-hidden /> Edit <span className="sr-only">{meta.title}</span>
        </button>
      </div>
      {children}
    </section>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-line/70 pb-2">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Full preview of the listing as travellers will see it, with per-section edit links. */
export function PreviewStep() {
  const data = useAppSelector(selectSessionData)!
  const { basics, specs, location, pricing, photos, features } = data
  const parsed = listingDraftSchema.safeParse(data)
  const issues = parsed.success ? [] : parsed.error.issues

  return (
    // Empty form keeps the shared footer wiring consistent; publishing is triggered by the footer.
    <form id={STEP_FORM_ID} onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <LocalOnlyNotice />
      {issues.length > 0 ? (
        <div role="alert" className="rounded-[16px] bg-[#fff6f6] p-4 text-sm text-danger">
          <p className="font-semibold">Complete these items before publishing:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {issues.slice(0, 6).map((issue) => (
              <li key={issue.path.join('.') + issue.message}>
                {WIZARD_STEPS.find((s) => s.id === issue.path[0])?.short}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-[16px] bg-[#e8f5e9] p-4 text-sm font-medium text-success">
          <CheckCircle2 className="size-5" aria-hidden /> Everything looks great — your listing is ready to publish.
        </p>
      )}

      {/* Traveller-facing header */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {photos.length > 0 ? (
          <CamperGallery
            images={[...photos].sort((a, b) => Number(b.isCover) - Number(a.isCover)).map((p) => ({ id: p.id, src: p.src, alt: p.name }))}
            title={basics.title || 'Your camper'}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center rounded-[20px] bg-surface text-sm text-muted">No photos yet</div>
        )}
        <div className="space-y-3">
          <Badge tone="accent">New</Badge>
          <h2 className={cn('text-2xl font-semibold', !basics.title && 'text-muted')}>{basics.title || 'Untitled camper'}</h2>
          <p className="text-sm text-muted">
            {[basics.brand, basics.model, basics.year].filter(Boolean).join(' · ') || 'Brand, model and year'}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1"><MapPin className="size-4 text-brand" aria-hidden /> {location.city || 'City'}, {location.country || 'Country'}</span>
            <span className="inline-flex items-center gap-1"><Users className="size-4 text-brand" aria-hidden /> {basics.passengers || '–'} travellers</span>
          </p>
          <p className="text-[28px] font-bold text-brand">
            {pricing.dailyPrice ? formatPrice(Number(pricing.dailyPrice)) : '₩ —'}
            <span className="text-sm font-medium text-muted"> / day</span>
          </p>
          <p className="line-clamp-5 text-sm leading-relaxed whitespace-pre-line">{basics.description || 'Your description will appear here.'}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section step="basics">
          <Rows
            rows={[
              ['Type', CAMPER_TYPE_LABELS[basics.type]],
              ['Section', CATEGORY_LABELS[basics.category].plural],
              ['Passengers', show(basics.passengers)],
              ['Sleeping places', show(basics.sleepingPlaces)],
            ]}
          />
        </Section>
        <Section step="specs">
          <Rows
            rows={[
              ['Size (L×W×H)', specs.lengthM && specs.widthM && specs.heightM ? `${specs.lengthM} × ${specs.widthM} × ${specs.heightM} m` : show('')],
              ['Weight', show(specs.weightKg, ' kg')],
              ['Engine', show(specs.engineType)],
              ['Transmission', specs.transmission === 'manual' ? 'Manual' : 'Automatic'],
              ['Fuel', FUEL_LABELS[specs.fuelType]],
              ['Mileage', show(specs.mileageKm, ' km')],
              ['Registration', show(specs.registrationNumber)],
            ]}
          />
        </Section>
        <Section step="features">
          {features.length ? <LocalFeatureList features={features} /> : <p className="text-sm text-danger/80">No features selected</p>}
        </Section>
        <Section step="photos">
          <p className="text-sm">{photos.length} photo{photos.length === 1 ? '' : 's'} · cover: {photos.find((p) => p.isCover)?.name ?? '—'}</p>
        </Section>
        <Section step="location">
          <Rows
            rows={[
              ['Address', show(location.address)],
              ['City', show(location.city)],
              ['Postal code', show(location.postalCode)],
              ['Map pin', location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lng}` : 'Not set'],
            ]}
          />
        </Section>
        <Section step="pricing">
          <Rows
            rows={[
              ['Daily price', pricing.dailyPrice ? formatPrice(Number(pricing.dailyPrice)) : show('')],
              ['Weekly / monthly', `${pricing.weeklyDiscountPct || 0}% / ${pricing.monthlyDiscountPct || 0}%`],
              ['Deposit', formatPrice(Number(pricing.securityDeposit) || 0)],
              ['Minimum rental', show(pricing.minRentalDays, ' nights')],
              ['Available', `${formatDate(pricing.availableFrom)} – ${formatDate(pricing.availableTo)}`],
              ['Extra fees', pricing.additionalFees.length ? pricing.additionalFees.map((f) => `${f.label || 'Fee'} ${formatPrice(Number(f.amount) || 0)}`).join(', ') : 'None'],
            ]}
          />
        </Section>
      </div>
    </form>
  )
}
