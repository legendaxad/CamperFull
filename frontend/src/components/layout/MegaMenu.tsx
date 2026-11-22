import { X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperImage } from '@/components/camper/CamperImage'
import { buttonClasses } from '@/components/common/buttonStyles'
import { Skeleton } from '@/components/common/Feedback'
import { ROUTES } from '@/constants/navigation'
import { selectCategoryPreview, selectCategoryPreviewCampers } from '@/features/campers/camperSelectors'
import { CATEGORY_PREVIEW_SIZE, fetchCategoryPreview } from '@/features/campers/camperSlice'
import type { Category } from '@/types/api'
import { coverImage } from '@/utils/camper'

interface MegaMenuProps {
  category: Category
  onClose: () => void
}

/** Dropdown under a category (Figma home frame 0:277): five campers + "See all". */
export function MegaMenu({ category, onClose }: MegaMenuProps) {
  const dispatch = useAppDispatch()
  const preview = useAppSelector((state) => selectCategoryPreview(state, category.slug))
  const items = useAppSelector((state) => selectCategoryPreviewCampers(state, category.slug))

  useEffect(() => {
    void dispatch(fetchCategoryPreview(category.slug))
  }, [dispatch, category.slug])

  const status = preview?.status ?? 'loading'

  return (
    <div className="absolute inset-x-0 top-full z-40 animate-fade-in border-t border-line bg-white shadow-nav">
      <div className="container-page relative py-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-4 rounded-full p-2 text-ink hover:bg-black/5 xl:right-[70px]"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
        {status === 'failed' ? (
          <p className="py-6 text-center text-sm text-muted">Campers could not be loaded right now.</p>
        ) : status !== 'succeeded' ? (
          <div className="grid grid-cols-5 gap-6" aria-label="Loading campers" role="status">
            {Array.from({ length: CATEGORY_PREVIEW_SIZE }, (_, i) => (
              <div key={i} className="space-y-3 p-2">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="mx-auto h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">New {category.name.toLowerCase()} campers are coming soon.</p>
        ) : (
          <ul className="grid grid-cols-5 gap-6">
            {items.map((camper) => (
              <li key={camper._id}>
                <Link
                  to={ROUTES.camper(camper.slug)}
                  onClick={onClose}
                  className="group flex flex-col items-center gap-3 rounded-[14px] p-2 transition hover:bg-surface"
                >
                  <CamperImage src={coverImage(camper)} alt="" className="h-24 w-full transition group-hover:scale-105" />
                  <span className="text-center text-sm font-semibold text-ink">{camper.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex justify-center">
          <Link to={ROUTES.category(category.slug)} onClick={onClose} className={`${buttonClasses({ size: 'sm' })} w-40`}>
            See all
          </Link>
        </div>
      </div>
    </div>
  )
}
