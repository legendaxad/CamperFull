import { Plus, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { buttonClasses } from '@/components/common/buttonStyles'
import { COMPARE_LIMIT } from '@/constants/camper'
import { ROUTES } from '@/constants/navigation'
import { makeSelectCampersByIds } from '@/features/campers/camperSelectors'
import { removeFromCompare, selectCompareIds } from '@/features/comparison/comparisonSlice'
import { coverImage } from '@/utils/camper'
import { cn } from '@/utils/cn'
import { CamperImage } from './CamperImage'

/** Mini comparison list under the filters (Figma "Group 2327": three thumbnails + Compare button). */
export function CompareTray({ className }: { className?: string }) {
  const dispatch = useAppDispatch()
  const ids = useAppSelector(selectCompareIds)
  const selectByIds = useMemo(() => makeSelectCampersByIds(), [])
  const campers = useAppSelector((state) => selectByIds(state, ids))

  return (
    <section aria-labelledby="compare-tray-title" className={className}>
      <h2 id="compare-tray-title" className="text-sm font-semibold text-brand">
        Compare <span className="text-muted">({campers.length}/{COMPARE_LIMIT})</span>
      </h2>
      <ul className="mt-2 grid grid-cols-3 gap-1.5">
        {Array.from({ length: COMPARE_LIMIT }, (_, i) => {
          const camper = campers[i]
          return (
            <li key={camper?._id ?? `empty-${i}`} className="relative aspect-[75/90] rounded-[10px] bg-white shadow-card">
              {camper ? (
                <>
                  <Link to={ROUTES.camper(camper.slug)} title={camper.name} className="flex size-full items-center p-1">
                    <CamperImage src={coverImage(camper)} alt={camper.name} rounded={false} className="h-3/5 w-full" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => dispatch(removeFromCompare(camper._id))}
                    aria-label={`Remove ${camper.name} from comparison`}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-white"
                  >
                    <X className="size-3" />
                  </button>
                </>
              ) : (
                <span className="flex size-full items-center justify-center text-[#c4c4c4]" aria-label="Empty slot">
                  <Plus className="size-5" aria-hidden />
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-4 flex justify-end">
        <Link
          to={ROUTES.compare}
          aria-disabled={campers.length < 2}
          className={cn(buttonClasses({ size: 'sm' }), 'rounded-full px-5', campers.length < 2 && 'pointer-events-none opacity-55')}
        >
          Compare
        </Link>
      </div>
    </section>
  )
}
