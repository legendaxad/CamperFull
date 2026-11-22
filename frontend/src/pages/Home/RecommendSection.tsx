import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperImage } from '@/components/camper/CamperImage'
import { CarouselArrow, CarouselDots } from '@/components/common/CarouselControls'
import { Button } from '@/components/common/Button'
import { Skeleton } from '@/components/common/Feedback'
import { ROUTES } from '@/constants/navigation'
import { listingQueryToParams } from '@/features/campers/camperFilters'
import { selectFeatured, selectFeaturedCampers } from '@/features/campers/camperSelectors'
import { fetchFeaturedCampers, retryCatalog } from '@/features/campers/camperSlice'
import { useCarousel } from '@/hooks/useCarousel'
import type { Camper } from '@/types/api'
import { coverImage } from '@/utils/camper'

const PAGE_SIZE = 4

interface BrandGroup {
  brand: string
  hero: Camper
  models: Camper[]
}

/** Groups featured campers by brand (campers without a brand are grouped by their name). */
function groupByBrand(campers: Camper[]): BrandGroup[] {
  const groups = new Map<string, Camper[]>()
  for (const camper of campers) {
    const key = camper.brand ?? camper.name
    groups.set(key, [...(groups.get(key) ?? []), camper])
  }
  return [...groups.entries()].map(([brand, models]) => ({
    brand,
    models,
    hero: models.find((m) => m.isFeatured) ?? models[0]!,
  }))
}

function BrandCard({ group }: { group: BrandGroup }) {
  const navigate = useNavigate()
  const badge = group.hero.isFeatured ? 'best' : null
  const rangeHref = group.hero.brand
    ? { pathname: ROUTES.campers, search: listingQueryToParams({ brand: [group.brand] }).toString() }
    : { pathname: ROUTES.camper(group.hero.slug) }
  return (
    <div className="flex flex-col items-center text-center">
      <Link to={ROUTES.camper(group.hero.slug)} className="relative block w-full px-2">
        <CamperImage src={coverImage(group.hero)} alt={group.hero.name} className="h-36 w-full md:h-40" />
        {badge && (
          <span className="absolute top-0 right-3 flex size-11 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white uppercase shadow-card">
            {badge}
          </span>
        )}
      </Link>
      <p className="mt-4 text-base font-medium text-ink">{group.brand}</p>
      {/* Skewed blue banner button from Figma ("Discover the range"). */}
      <Link
        to={rangeHref}
        className="mt-3 inline-flex h-10 w-full max-w-[210px] -skew-x-12 items-center justify-center bg-brand text-sm font-bold text-white transition hover:bg-brand-dark"
      >
        <span className="skew-x-12">Discover the range</span>
      </Link>
      <label className="sr-only" htmlFor={`models-${group.brand}`}>
        Choose a {group.brand} model
      </label>
      <select
        id={`models-${group.brand}`}
        defaultValue=""
        onChange={(e) => e.target.value && navigate(ROUTES.camper(e.target.value))}
        className="mt-3 cursor-pointer appearance-none bg-transparent px-2 py-1 text-center text-sm text-ink hover:text-brand focus:outline-none"
      >
        <option value="" disabled>
          Choose a model ▾
        </option>
        {group.models.map((model) => (
          <option key={model._id} value={model.slug}>
            {model.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/** "Recommend" brand carousel (Figma Group 2193). */
export function RecommendSection() {
  const dispatch = useAppDispatch()
  const featured = useAppSelector(selectFeatured)
  const campers = useAppSelector(selectFeaturedCampers)
  useEffect(() => {
    void dispatch(fetchFeaturedCampers())
  }, [dispatch])
  const loading = featured.status === 'idle' || featured.status === 'loading'
  const groups = useMemo(() => groupByBrand(campers), [campers])
  const pages = Math.max(1, Math.ceil(groups.length / PAGE_SIZE))
  const { index, go, next, prev } = useCarousel({ count: pages })
  const visible = groups.slice(index * PAGE_SIZE, index * PAGE_SIZE + PAGE_SIZE)

  return (
    <section className="py-14 md:py-[70px]" aria-labelledby="recommend-title">
      <div className="container-page">
        <div className="text-center">
          <h2 id="recommend-title" className="section-title">
            Recommend
          </h2>
        </div>
        {featured.status === 'failed' && (
          <div className="mt-10 text-center text-sm text-muted">
            <p>{featured.error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => {
              dispatch(retryCatalog())
              void dispatch(fetchFeaturedCampers())
            }}>
              Try again
            </Button>
          </div>
        )}
        {featured.status === 'succeeded' && campers.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted">New campers are on their way — check back soon.</p>
        )}
        <div className="mt-10 flex items-center gap-4 lg:-mx-[50px]">
          <CarouselArrow direction="prev" onClick={prev} className="hidden md:flex" label="Previous brands" />
          <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-10 min-[520px]:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-48" />
                  </div>
                ))
              : visible.map((group) => <BrandCard key={group.brand} group={group} />)}
          </div>
          <CarouselArrow direction="next" onClick={next} className="hidden md:flex" label="Next brands" />
        </div>
        <div className="mt-8">
          <CarouselDots count={pages} index={index} onSelect={go} label="Brand page" />
        </div>
      </div>
    </section>
  )
}
