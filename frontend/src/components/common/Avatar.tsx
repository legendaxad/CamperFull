import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

const SIZES = { sm: 'size-8 text-xs', md: 'size-12 text-sm', lg: 'size-24 text-2xl' }

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return src ? (
    <img src={src} alt="" className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)} />
  ) : (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white',
        SIZES[size],
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  )
}
