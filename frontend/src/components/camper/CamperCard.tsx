import { Check, GitCompareArrows, Heart, MapPin, Users } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Feedback'
import { ROUTES } from '@/constants/navigation'
import { selectIsInCart } from '@/features/cart/cartSlice'
import { selectIsCompared } from '@/features/comparison/comparisonSlice'
import { selectIsFavorite } from '@/features/favorites/favoritesSlice'
import { useCamperActions } from '@/hooks/useCamperActions'
import type { CamperCardData } from '@/types/api'
import { camperLocation, coverImage } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { formatPrice } from '@/utils/format'
import { CamperImage } from './CamperImage'
import { Rating } from './Rating'

interface CamperCardProps {
  camper: CamperCardData
  layout?: 'grid' | 'list'
  description?: string
}

export function FavoriteToggle({ camper, className }: { camper: Pick<CamperCardData, '_id' | 'name'>; className?: string }) {
  const isFavorite = useAppSelector((state) => selectIsFavorite(state, camper._id))
  const busy = useAppSelector((state) => state.favorites.pending.includes(camper._id))
  const { toggleFavoriteCamper } = useCamperActions()
  return (
    <button
      type="button"
      onClick={() => void toggleFavoriteCamper(camper)}
      disabled={busy}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remove ${camper.name} from favorites` : `Save ${camper.name} to favorites`}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-white/95 shadow-card transition hover:scale-110 disabled:opacity-60',
        className,
      )}
    >
      <Heart className={cn('size-[18px] transition', isFavorite ? 'fill-accent text-accent' : 'text-ink')} />
    </button>
  )
}

/**
 * Marketplace card — Figma component "сard" (20px radius, soft shadow, name / brand /
 * rating / price and the "Order" + "Compare" outline buttons).
 */
export const CamperCard = memo(function CamperCard({ camper, layout = 'grid', description }: CamperCardProps) {
  const isCompared = useAppSelector((state) => selectIsCompared(state, camper._id))
  const inCart = useAppSelector((state) => selectIsInCart(state, camper._id))
  const { toggleCompareCamper, addCamperToCart } = useCamperActions()
  const href = ROUTES.camper(camper.slug)
  const isList = layout === 'list'
  const place = camperLocation(camper)

  return (
    <article
      className={cn(
        'group relative flex animate-fade-in rounded-[20px] bg-white p-2.5 shadow-card transition hover:shadow-raised',
        isList ? 'flex-col gap-4 sm:flex-row' : 'flex-col',
      )}
    >
      <div className={cn('relative', isList ? 'sm:w-64 sm:shrink-0' : '')}>
        <Link to={href} tabIndex={-1} aria-hidden className="block overflow-hidden rounded-[20px]">
          <CamperImage
            src={coverImage(camper)}
            alt=""
            className={cn('w-full transition duration-300 group-hover:scale-[1.04]', isList ? 'h-44' : 'aspect-[200/138]')}
          />
        </Link>
        {camper.isFeatured && (
          <Badge tone="accent" className="absolute top-2 left-2">
            Best
          </Badge>
        )}
        <FavoriteToggle camper={camper} className="absolute top-2 right-2 z-10" />
      </div>

      <div className={cn('flex flex-1 flex-col px-1.5 pb-1', isList ? 'sm:py-2 sm:pr-3' : 'pt-3')}>
        <h3 className="truncate text-base font-semibold text-ink">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] focus:outline-none">
            {camper.name}
          </Link>
        </h3>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-ink">{camper.brand ?? camper.category.name}</span>
          <Rating value={camper.ratingAverage} count={isList ? camper.ratingCount : undefined} />
        </div>
        {isList && description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted">{description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {place && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {place}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> {camper.capacity.seats}
          </span>
        </div>
        <p className="mt-3 text-[20px] leading-none font-bold text-brand">
          {formatPrice(camper.pricing.dailyRate)}
          <span className="ml-1 text-xs font-medium text-muted">/ day</span>
        </p>
        <div className={cn('relative z-10 mt-4 grid grid-cols-2 gap-2.5', isList && 'sm:mt-auto sm:max-w-xs')}>
          <Button
            variant={inCart ? 'primary' : 'outline'}
            size="sm"
            onClick={() => addCamperToCart(camper)}
            aria-label={`Order ${camper.name}`}
          >
            {inCart ? <Check className="size-4" aria-hidden /> : null}
            {inCart ? 'In trips' : 'Order'}
          </Button>
          <Button
            variant={isCompared ? 'primary' : 'outline'}
            size="sm"
            aria-pressed={isCompared}
            onClick={() => toggleCompareCamper(camper)}
            aria-label={`${isCompared ? 'Remove from' : 'Add to'} comparison: ${camper.name}`}
          >
            {isCompared && <GitCompareArrows className="size-4" aria-hidden />}
            Compare
          </Button>
        </div>
      </div>
    </article>
  )
})

export function CamperCardSkeleton({ layout = 'grid' }: { layout?: 'grid' | 'list' }) {
  return (
    <div className={cn('flex rounded-[20px] bg-white p-2.5 shadow-card', layout === 'list' ? 'flex-col gap-4 sm:flex-row' : 'flex-col')} aria-hidden>
      <div className={cn('skeleton rounded-[20px]', layout === 'list' ? 'h-44 sm:w-64' : 'aspect-[200/138] w-full')} />
      <div className="flex-1 space-y-2.5 px-1.5 pt-3 pb-1">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton mt-4 h-6 w-1/3" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="skeleton h-9 rounded-[10px]" />
          <div className="skeleton h-9 rounded-[10px]" />
        </div>
      </div>
    </div>
  )
}

export function CamperGridSkeleton({ count = 8, layout = 'grid' }: { count?: number; layout?: 'grid' | 'list' }) {
  return (
    <div
      className={cn('grid gap-5', layout === 'grid' ? 'grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}
      role="status"
      aria-label="Loading campers"
    >
      {Array.from({ length: count }, (_, i) => (
        <CamperCardSkeleton key={i} layout={layout} />
      ))}
    </div>
  )
}
