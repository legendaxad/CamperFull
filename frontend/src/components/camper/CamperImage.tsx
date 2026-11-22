import { Caravan } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'
import { isCutoutImage } from '@/utils/camper'

interface CamperImageProps {
  src: string
  alt: string
  className?: string
  /** Rounded inner image like the Figma card (20px radius). */
  rounded?: boolean
  loading?: 'lazy' | 'eager'
}

/**
 * Transparent PNG cut-outs (the Figma look) use `object-contain`; photos use `object-cover`.
 * Campers without images (or with broken URLs) get a neutral placeholder. This component picks the
 * right fit and shows a graceful fallback when an image fails to load.
 */
export function CamperImage({ src, alt, className, rounded = true, loading = 'lazy' }: CamperImageProps) {
  const [failed, setFailed] = useState(false)
  const cutout = isCutoutImage(src)

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-brand-soft to-surface text-brand/60',
          rounded && 'rounded-[20px]',
          className,
        )}
        role="img"
        aria-label={alt || 'Photo coming soon'}
      >
        <Caravan className="size-9" strokeWidth={1.5} aria-hidden />
        <span className="text-[11px] font-medium">Photo coming soon</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      onError={() => setFailed(true)}
      className={cn(cutout ? 'object-contain' : 'object-cover', rounded && 'rounded-[20px]', className)}
    />
  )
}
