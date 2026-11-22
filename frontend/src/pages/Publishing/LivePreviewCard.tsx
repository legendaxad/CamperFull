import { ImagePlus, MapPin, Users } from 'lucide-react'
import { useAppSelector } from '@/app/hooks'
import { selectCompletion, selectSessionData } from '@/features/publishing/publishingSelectors'
import { formatPrice } from '@/utils/format'

/** Sidebar preview mirroring the marketplace card while the user types. */
export function LivePreviewCard() {
  const data = useAppSelector(selectSessionData)!
  const completion = useAppSelector(selectCompletion)
  const cover = data.photos.find((p) => p.isCover) ?? data.photos[0]
  const price = Number(data.pricing.dailyPrice)

  return (
    <aside className="space-y-4" aria-label="Live preview">
      <div className="rounded-[20px] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Listing completeness</span>
          <span className="font-bold text-brand">{completion}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-[#2a9bd8] transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">How travellers see it</p>
        <article className="rounded-[20px] bg-white p-2.5 shadow-card">
          {cover ? (
            <img src={cover.src} alt="" className="aspect-[200/138] w-full rounded-[20px] object-cover" />
          ) : (
            <div className="flex aspect-[200/138] w-full flex-col items-center justify-center gap-2 rounded-[20px] bg-surface text-muted">
              <ImagePlus className="size-7" aria-hidden />
              <span className="text-xs">Cover photo</span>
            </div>
          )}
          <div className="px-1.5 pt-3 pb-2">
            <h3 className="truncate text-base font-semibold">{data.basics.title || 'Your camper title'}</h3>
            <p className="text-xs">{data.basics.brand || 'Brand'}</p>
            <div className="mt-2 flex gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {data.location.city || 'City'}</span>
              <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {data.basics.passengers || '–'}</span>
            </div>
            <p className="mt-3 text-[22px] leading-none font-bold text-brand">
              {Number.isFinite(price) && price > 0 ? formatPrice(price) : '₩ —'}
              <span className="ml-1 text-xs font-medium text-muted">/ day</span>
            </p>
          </div>
        </article>
      </div>
    </aside>
  )
}
