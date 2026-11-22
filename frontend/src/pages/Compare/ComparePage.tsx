import { Check, CirclePlus, GitCompareArrows, Minus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import heroCaravan from '@/assets/images/heroes/hero-caravan.jpg'
import { CamperImage } from '@/components/camper/CamperImage'
import { Button, ButtonLink } from '@/components/common/Button'
import { EmptyState, ErrorState } from '@/components/common/Feedback'
import { PageHero } from '@/components/layout/PageHero'
import { COMPARE_LIMIT } from '@/constants/camper'
import { ROUTES } from '@/constants/navigation'
import { makeSelectCampersByIds, selectCompareRequest } from '@/features/campers/camperSelectors'
import { fetchCompareCampers } from '@/features/campers/camperSlice'
import { clearCompare, pruneCompare, removeFromCompare, selectCompareIds } from '@/features/comparison/comparisonSlice'
import { useCamperActions } from '@/hooks/useCamperActions'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import type { Camper, FeatureRef } from '@/types/api'
import { coverImage, FUEL_TYPE_LABELS, LICENSE_LABELS, mmToMeters, TRANSMISSION_LABELS } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatNumber, formatPrice } from '@/utils/format'

interface Row {
  label: string
  value: (c: Camper) => string
  /** Returns a comparable number; the best value in the row gets highlighted. */
  score?: (c: Camper) => number
}

const ROWS: Row[] = [
  { label: 'Price per day', value: (c) => formatPrice(c.pricing.dailyRate), score: (c) => -c.pricing.dailyRate },
  { label: 'Rating', value: (c) => (c.ratingCount ? c.ratingAverage.toFixed(1) : 'New'), score: (c) => c.ratingAverage },
  { label: 'Category', value: (c) => c.category.name },
  { label: 'Brand', value: (c) => c.brand ?? '—' },
  { label: 'Company', value: (c) => c.company ?? '—' },
  { label: 'Model year', value: (c) => (c.modelYear ? String(c.modelYear) : '—'), score: (c) => c.modelYear ?? 0 },
  { label: 'Seats', value: (c) => String(c.capacity.seats), score: (c) => c.capacity.seats },
  { label: 'Sleeps', value: (c) => String(c.capacity.sleeps), score: (c) => c.capacity.sleeps },
  { label: 'License type', value: (c) => LICENSE_LABELS[c.licenseType] },
  { label: 'Length', value: (c) => mmToMeters(c.specifications.lengthMm) ?? '—' },
  { label: 'Transmission', value: (c) => TRANSMISSION_LABELS[c.specifications.transmission] },
  { label: 'Fuel', value: (c) => FUEL_TYPE_LABELS[c.specifications.fuelType] },
  { label: 'Mileage', value: (c) => (c.specifications.mileageKm !== undefined ? `${formatNumber(c.specifications.mileageKm)} km` : '—') },
  { label: 'Location', value: (c) => c.location.region },
]

function bestIds(campers: Camper[], score?: Row['score']): Set<string> {
  if (!score || campers.length < 2) return new Set()
  const max = Math.max(...campers.map(score))
  const winners = campers.filter((c) => score(c) === max)
  return winners.length === campers.length ? new Set() : new Set(winners.map((c) => c._id))
}

export default function ComparePage() {
  useDocumentTitle('Compare campers')
  const dispatch = useAppDispatch()
  const ids = useAppSelector(selectCompareIds)
  const request = useAppSelector(selectCompareRequest)
  const selectByIds = useMemo(() => makeSelectCampersByIds(), [])
  const campers = useAppSelector((state) => selectByIds(state, request.data))
  const { addCamperToCart } = useCamperActions()

  // GET /campers/compare keeps the requested order and drops archived campers.
  useEffect(() => {
    if (ids.length) void dispatch(fetchCompareCampers(ids))
  }, [dispatch, ids])
  useEffect(() => {
    if (request.status === 'succeeded' && request.key === ids.join(',') && request.data.length < ids.length) {
      dispatch(pruneCompare(request.data))
    }
  }, [dispatch, request, ids])

  const isLoading = ids.length > 0 && (request.status === 'loading' || request.key !== ids.join(','))
  const features = useMemo(() => {
    const byId = new Map<string, FeatureRef>()
    for (const camper of campers) for (const feature of camper.features) byId.set(feature._id, feature)
    return [...byId.values()]
  }, [campers])
  const columns = `repeat(${Math.max(campers.length, 1) + (campers.length < COMPARE_LIMIT ? 1 : 0)}, minmax(220px, 1fr))`

  return (
    <>
      <PageHero
        image={heroCaravan}
        title="Compare our models"
        crumbs={[{ label: 'Home', to: ROUTES.home }, { label: 'Motors', to: ROUTES.campers }, { label: 'Compare' }]}
      />
      <div className="container-page py-10 md:py-[70px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-medium md:text-4xl">Compare Models</h2>
          <div className="flex items-center gap-3">
            {campers.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => dispatch(clearCompare())} icon={<Trash2 className="size-4" aria-hidden />}>
                Clear all
              </Button>
            )}
            {campers.length < COMPARE_LIMIT && (
              <Link to={ROUTES.campers} className="inline-flex items-center gap-2 text-lg font-medium hover:text-brand md:text-[22px]">
                <CirclePlus className="size-7 stroke-[1.5]" aria-hidden /> Add model
              </Link>
            )}
          </div>
        </div>

        {request.status === 'failed' && ids.length > 0 ? (
          <div className="mt-10">
            <ErrorState message={request.error ?? 'Campers could not be loaded.'} onRetry={() => void dispatch(fetchCompareCampers(ids))} />
          </div>
        ) : isLoading ? (
          <div className="mt-10 grid gap-5 sm:grid-cols-3" role="status" aria-label="Loading comparison">
            {ids.map((id) => <div key={id} className="skeleton h-96 rounded-[20px]" />)}
          </div>
        ) : campers.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={GitCompareArrows}
            title="Nothing to compare yet"
            description={`Add up to ${COMPARE_LIMIT} campers with the “Compare” button on any listing to see them side by side.`}
            action={<ButtonLink to={ROUTES.campers}>Browse campers</ButtonLink>}
          />
        ) : (
          <div className="-mx-4 mt-10 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <div className="grid min-w-fit gap-5" style={{ gridTemplateColumns: columns }}>
              {campers.map((camper) => (
                <article key={camper._id} className="flex flex-col" aria-label={camper.name}>
                  <div className="relative rounded-[20px] bg-white p-3 shadow-card">
                    <Link to={ROUTES.camper(camper.slug)}>
                      <CamperImage src={coverImage(camper)} alt={camper.name} className="aspect-[2/1] w-full" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => dispatch(removeFromCompare(camper._id))}
                      className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-card hover:bg-surface"
                      aria-label={`Remove ${camper.name} from comparison`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <h3 className="mt-5 text-center text-xl font-semibold">
                    <Link to={ROUTES.camper(camper.slug)} className="hover:text-brand">{camper.name}</Link>
                  </h3>
                  <dl className="mt-4 px-2 md:px-5">
                    {ROWS.map((row) => {
                      const best = bestIds(campers, row.score).has(camper._id)
                      return (
                        <div key={row.label} className="flex items-center justify-between gap-3 border-b border-ink/70 py-3">
                          <dt className="text-sm text-muted">{row.label}</dt>
                          <dd className={cn('text-right text-base', best ? 'font-bold text-brand' : 'text-ink')}>
                            {row.value(camper)}
                          </dd>
                        </div>
                      )
                    })}
                    {features.map((feature) => (
                      <div key={feature._id} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                        <dt className="text-sm text-muted">{feature.name}</dt>
                        <dd>
                          {camper.features.some((f) => f._id === feature._id) ? (
                            <Check className="size-5 text-success" aria-label="Included" />
                          ) : (
                            <Minus className="size-5 text-[#c4c4c4]" aria-label="Not included" />
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Button variant="outline" size="lg" className="mx-2 mt-8 border-2 text-lg md:mx-4" onClick={() => addCamperToCart(camper)}>
                    Order
                  </Button>
                </article>
              ))}
              {campers.length < COMPARE_LIMIT && (
                <Link
                  to={ROUTES.campers}
                  className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-[#c4c4c4] text-muted transition hover:border-brand hover:text-brand"
                >
                  <CirclePlus className="size-10 stroke-[1.25]" aria-hidden />
                  <span className="font-semibold">Add a camper</span>
                  <span className="text-xs">{COMPARE_LIMIT - campers.length} slot{COMPARE_LIMIT - campers.length > 1 ? 's' : ''} left</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
