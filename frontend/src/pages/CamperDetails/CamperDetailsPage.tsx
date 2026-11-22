import { GitCompareArrows, MapPin, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import heroCaravan from '@/assets/images/heroes/hero-caravan.jpg'
import { BookingWidget } from '@/components/camper/BookingWidget'
import { FavoriteToggle } from '@/components/camper/CamperCard'
import { CamperGallery } from '@/components/camper/CamperGallery'
import { FeatureList, SpecTable } from '@/components/camper/CamperSpecs'
import { Rating } from '@/components/camper/Rating'
import { Button } from '@/components/common/Button'
import { Badge, ErrorState, Skeleton } from '@/components/common/Feedback'
import { PageHero } from '@/components/layout/PageHero'
import { ROUTES } from '@/constants/navigation'
import { selectCamperByIdOrSlug, selectDetailRequest } from '@/features/campers/camperSelectors'
import { fetchCamperDetail } from '@/features/campers/camperSlice'
import { selectIsCompared } from '@/features/comparison/comparisonSlice'
import { useCamperActions } from '@/hooks/useCamperActions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { Camper } from '@/types/api'
import { camperLocation, LICENSE_LABELS } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import NotFoundPage from '../NotFound/NotFoundPage'
import { DetailTabs } from './DetailTabs'

function DetailsSkeleton() {
  return (
    <div className="container-page grid gap-8 py-12 lg:grid-cols-2" role="status" aria-label="Loading camper">
      <Skeleton className="aspect-[4/3] w-full rounded-[20px]" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-40 w-full rounded-[20px]" />
      </div>
    </div>
  )
}

export default function CamperDetailsPage() {
  const { id: idOrSlug } = useParams()
  const dispatch = useAppDispatch()
  const camper = useAppSelector((state) => selectCamperByIdOrSlug(state, idOrSlug))
  const request = useAppSelector((state) => selectDetailRequest(state, idOrSlug))
  useDocumentTitle(camper?.name ?? 'Camper')

  // Always load the full detail (list responses may be cached, but the detail also counts the view).
  useEffect(() => {
    if (idOrSlug) void dispatch(fetchCamperDetail(idOrSlug))
  }, [dispatch, idOrSlug])

  if (request?.status === 'failed') {
    if (request.notFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState message={request.error ?? 'The camper could not be loaded.'} onRetry={() => idOrSlug && void dispatch(fetchCamperDetail(idOrSlug))} />
      </div>
    )
  }
  if (!camper) return <DetailsSkeleton />
  // Keyed so local UI state (gallery index, booking dates) resets when navigating between campers.
  return <CamperDetails key={camper._id} camper={camper} />
}

function CamperDetails({ camper }: { camper: Camper }) {
  const isCompared = useAppSelector((state) => selectIsCompared(state, camper._id))
  const { addCamperToCart, toggleCompareCamper } = useCamperActions()
  const place = camperLocation(camper)
  const images = useMemo(
    () => camper.images.map((image, i) => ({ id: image._id ?? `${camper._id}-${i}`, src: image.url, alt: image.alt })),
    [camper],
  )
  // Highlights are paired with photos 2..n, alternating like the Figma "carinfo" frame.
  const stories = camper.highlights.map((highlight, i) => ({ ...highlight, image: camper.images[i + 1]?.url ?? null }))

  return (
    <>
      <PageHero
        image={camper.images[1]?.url ?? camper.images[0]?.url ?? heroCaravan}
        title={camper.name}
        crumbs={[
          { label: 'Home', to: ROUTES.home },
          { label: camper.category.name, to: ROUTES.category(camper.category.slug) },
          { label: camper.name },
        ]}
      >
        <Button onClick={() => addCamperToCart(camper)} icon={<ShoppingCart className="size-4" aria-hidden />}>
          ADD TO CART
        </Button>
        <Button variant="outline-white" onClick={() => toggleCompareCamper(camper)} aria-pressed={isCompared} icon={<GitCompareArrows className="size-4" aria-hidden />}>
          {isCompared ? 'COMPARING' : 'COMPARE'}
        </Button>
      </PageHero>

      {camper.status !== 'AVAILABLE' && (
        <div className="bg-[#fff4e5] py-3 text-center text-sm font-medium text-[#8a4b00]">
          This camper is temporarily unavailable for new bookings.
        </div>
      )}

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-14">
        <CamperGallery images={images} title={camper.name} />

        <div className="space-y-6">
          {/* Summary card (Figma: name, price, Company / People / License type). */}
          <section className="rounded-[20px] bg-white p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{camper.name}</h2>
                  {camper.isFeatured && <Badge tone="accent">Best</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {[camper.brand, camper.baseVehicle, camper.modelYear].filter(Boolean).join(' · ') || camper.category.name}
                </p>
              </div>
              <FavoriteToggle camper={camper} className="shrink-0" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
              <Rating value={camper.ratingAverage} count={camper.ratingCount} className="text-sm" />
              <p className="text-[28px] leading-none font-bold text-brand">
                {formatPrice(camper.pricing.dailyRate)}
                <span className="text-sm font-medium text-muted"> / day</span>
              </p>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-10 gap-y-2.5 text-sm">
              {camper.company && (
                <>
                  <dt>Company</dt>
                  <dd className="text-muted">{camper.company}</dd>
                </>
              )}
              <dt>People</dt>
              <dd className="text-muted">{camper.capacity.seats} seats · {camper.capacity.sleeps} berths</dd>
              <dt>License type</dt>
              <dd className="text-muted">{LICENSE_LABELS[camper.licenseType]}</dd>
              {place && (
                <>
                  <dt>Location</dt>
                  <dd className="flex items-center gap-1 text-muted"><MapPin className="size-3.5" aria-hidden /> {place}</dd>
                </>
              )}
            </dl>
          </section>
          {camper.status === 'AVAILABLE' && <BookingWidget camper={camper} />}
        </div>
      </div>

      <section className="container-page" aria-labelledby="about-title">
        <div className="rounded-[20px] bg-white p-6 shadow-card md:p-8">
          <h2 id="about-title" className="text-xl font-semibold">About this camper</h2>
          <p className="mt-3 leading-relaxed whitespace-pre-line text-ink">{camper.description}</p>
          <h3 className="mt-8 text-base font-semibold">Equipment</h3>
          <FeatureList features={camper.features} className="mt-3" />
          <h3 className="mt-8 text-base font-semibold">Technical specifications</h3>
          <SpecTable camper={camper} className="mt-2" />
          {camper.location.pickupNotes && (
            <>
              <h3 className="mt-8 text-base font-semibold">Pickup notes</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{camper.location.pickupNotes}</p>
            </>
          )}
        </div>
      </section>

      {stories.length > 0 && (
        <section className="mt-14" aria-label="Highlights">
          {stories.map((story, i) => (
            <div key={story.title} className={cn('grid bg-white md:grid-cols-2', i % 2 === 1 && 'md:[&>*:first-child]:order-2')}>
              <div className="flex flex-col justify-center px-6 py-10 md:px-[70px] md:py-16">
                <h3 className="text-2xl font-medium md:text-[28px]">{story.title}</h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed">{story.description}</p>
              </div>
              {story.image ? (
                <img src={story.image} alt="" loading="lazy" className="h-64 w-full object-cover md:h-[370px]" />
              ) : (
                <div className="hidden bg-brand-soft md:block" aria-hidden />
              )}
            </div>
          ))}
        </section>
      )}

      <DetailTabs camper={camper} />
    </>
  )
}
