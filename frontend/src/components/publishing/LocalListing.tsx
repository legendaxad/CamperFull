import { HardDrive, MapPin, Users } from 'lucide-react'
import { FEATURES, type FeatureKey } from '@/constants/camper'
import type { CamperListing } from '@/types/camper'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import { localCover } from '@/utils/localListing'

/*
 * Presentation for listings created in the wizard. These live only in this browser
 * (the backend has no customer listing endpoint), so they are rendered separately from
 * marketplace campers and always carry a "saved on this device" label.
 */

export function LocalOnlyNotice({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-xl bg-[#fff4e5] p-3 text-xs leading-relaxed text-[#8a4b00]', className)}>
      <HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden />
      Saved on this device only — not yet visible in the marketplace. Customer listings will be submitted to FullCamper once
      online listing is available.
    </p>
  )
}

export function LocalFeatureList({ features, className }: { features: FeatureKey[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {features.map((key) => {
        const { icon: Icon, label } = FEATURES[key]
        return (
          <li key={key} className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-sm font-medium text-brand">
            <Icon className="size-4" aria-hidden /> {label}
          </li>
        )
      })}
    </ul>
  )
}

export function LocalListingCard({ listing }: { listing: CamperListing }) {
  const cover = localCover(listing)
  return (
    <article className="rounded-[20px] bg-white p-2.5 shadow-card">
      {cover ? (
        <img src={cover} alt="" className="aspect-[200/138] w-full rounded-[20px] object-cover" />
      ) : (
        <div className="aspect-[200/138] w-full rounded-[20px] bg-surface" />
      )}
      <div className="px-1.5 pt-3 pb-2">
        <h3 className="truncate text-base font-semibold">{listing.basics.title}</h3>
        <p className="text-xs">{listing.basics.brand}</p>
        <div className="mt-2 flex gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {listing.location.city}</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {listing.basics.passengers}</span>
        </div>
        <p className="mt-3 text-[20px] leading-none font-bold text-brand">
          {formatPrice(listing.pricing.dailyPrice)}
          <span className="ml-1 text-xs font-medium text-muted">/ day</span>
        </p>
      </div>
    </article>
  )
}
