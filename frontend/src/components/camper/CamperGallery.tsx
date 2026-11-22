import { useState } from 'react'
import { CarouselArrow } from '@/components/common/CarouselControls'
import { cn } from '@/utils/cn'
import { CamperImage } from './CamperImage'

export interface GalleryImage {
  id: string
  src: string
  alt?: string
}

/** Main image + thumbnails, used on camper details and the listing-wizard preview. */
export function CamperGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const current = images[Math.min(index, Math.max(count - 1, 0))]
  const go = (next: number) => setIndex(((next % count) + count) % count)

  return (
    <div className="rounded-[20px] bg-white p-3 shadow-card">
      <div className="relative">
        <CamperImage
          src={current?.src ?? ''}
          alt={count ? current?.alt || `${title} — photo ${index + 1} of ${count}` : title}
          className="aspect-[4/3] w-full bg-white"
          loading="eager"
        />
        {count > 1 && (
          <>
            <CarouselArrow direction="prev" onClick={() => go(index - 1)} className="absolute top-1/2 left-3 -translate-y-1/2" label="Previous photo" />
            <CarouselArrow direction="next" onClick={() => go(index + 1)} className="absolute top-1/2 right-3 -translate-y-1/2" label="Next photo" />
            <span className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((image, i) => (
            <li key={image.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn('block overflow-hidden rounded-xl ring-2 transition', i === index ? 'ring-brand' : 'ring-transparent opacity-70 hover:opacity-100')}
              >
                <CamperImage src={image.src} alt="" rounded={false} className="h-14 w-20 bg-surface" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
