import type { Camper, FeatureRef } from '@/types/api'
import { featureIcon, FUEL_TYPE_LABELS, LICENSE_LABELS, mmToMeters, TRANSMISSION_LABELS } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format'

/** Rows for the spec table; optional backend fields are omitted when missing. */
function specRows(camper: Camper): [string, string][] {
  const { specifications: s, capacity } = camper
  const size = [mmToMeters(s.lengthMm), mmToMeters(s.widthMm), mmToMeters(s.heightMm)]
  const rows: [string, string | null | undefined][] = [
    ['Category', camper.category.name],
    ['Brand', camper.brand],
    ['Company', camper.company],
    ['Base vehicle', camper.baseVehicle],
    ['Model year', camper.modelYear?.toString()],
    ['Seats', String(capacity.seats)],
    ['Sleeps', String(capacity.sleeps)],
    ['Licence', LICENSE_LABELS[camper.licenseType]],
    ['Dimensions (L × W × H)', size.every(Boolean) ? size.join(' × ') : null],
    ['Weight', s.weightKg ? `${formatNumber(s.weightKg)} kg` : null],
    ['Engine', s.engine],
    ['Transmission', TRANSMISSION_LABELS[s.transmission]],
    ['Fuel', FUEL_TYPE_LABELS[s.fuelType]],
    ['Mileage', s.mileageKm !== undefined ? `${formatNumber(s.mileageKm)} km` : null],
    ['Rental length', `${camper.minNights}–${camper.maxNights} nights`],
  ]
  return rows.filter((row): row is [string, string] => Boolean(row[1]))
}

export function SpecTable({ camper, className }: { camper: Camper; className?: string }) {
  return (
    <dl className={cn('grid gap-x-8 sm:grid-cols-2', className)}>
      {specRows(camper).map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-line py-3 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function FeatureList({ features, className }: { features: FeatureRef[]; className?: string }) {
  if (!features.length) return <p className={cn('text-sm text-muted', className)}>No equipment listed yet.</p>
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {features.map((feature) => {
        const Icon = featureIcon(feature.icon)
        return (
          <li key={feature._id} className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand">
            <Icon className="size-4" aria-hidden /> {feature.name}
          </li>
        )
      })}
    </ul>
  )
}
