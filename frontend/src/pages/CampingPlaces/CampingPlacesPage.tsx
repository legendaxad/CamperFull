import { Clock, MapPin, Phone, Tent } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import heroCamping from '@/assets/images/heroes/hero-camping.jpg'
import { CamperImage } from '@/components/camper/CamperImage'
import { EmptyState, ErrorState, Skeleton } from '@/components/common/Feedback'
import { Pagination } from '@/components/common/Pagination'
import { PageHero } from '@/components/layout/PageHero'
import { ROUTES } from '@/constants/navigation'
import { fetchCampingPlaces, selectCampingPlaces } from '@/features/content/contentSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/** Camping places (Figma frames 0:1579 / 0:1603) — GET /camping-places. */
export default function CampingPlacesPage() {
  useDocumentTitle('Camping places')
  const dispatch = useAppDispatch()
  const places = useAppSelector(selectCampingPlaces)
  const [page, setPage] = useState(1)

  useEffect(() => {
    void dispatch(fetchCampingPlaces(page))
  }, [dispatch, page])

  return (
    <>
      <PageHero image={heroCamping} title="Camping places" crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Camping place' }]} />
      <div className="container-page py-10 md:py-[60px]">
        {places.status === 'failed' ? (
          <ErrorState message={places.error ?? 'Camping places could not be loaded.'} onRetry={() => void dispatch(fetchCampingPlaces(page))} />
        ) : places.status !== 'succeeded' ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading camping places">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[312/236] w-full rounded-[10px]" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        ) : places.items.length === 0 ? (
          <EmptyState icon={Tent} title="No camping places yet" description="Recommended camping sites will appear here soon." />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {places.items.map((place) => (
                <li key={place._id} className="group">
                  <div className="overflow-hidden rounded-[10px]">
                    <CamperImage src={place.images[0]?.url ?? ''} alt={place.images[0]?.alt ?? ''} rounded={false} className="aspect-[312/236] w-full transition duration-500 group-hover:scale-105" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">{place.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm">
                    <MapPin className="size-3.5 text-brand" aria-hidden /> {[place.city, place.region].filter(Boolean).join(' · ')}
                  </p>
                  {place.description && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{place.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {place.workingHours && (
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> {place.workingHours.from}–{place.workingHours.to}</span>
                    )}
                    {place.phone && (
                      <a href={`tel:${place.phone}`} className="inline-flex items-center gap-1 hover:text-brand"><Phone className="size-3.5" aria-hidden /> {place.phone}</a>
                    )}
                  </div>
                  {place.facilities.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {place.facilities.map((facility) => (
                        <li key={facility} className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">{facility}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Pagination page={places.meta?.page ?? 1} total={places.meta?.totalPages ?? 1} onChange={setPage} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
