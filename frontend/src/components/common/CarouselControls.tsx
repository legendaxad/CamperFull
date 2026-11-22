import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

/** Round arrow from Figma (40px circle; blue on light sections, translucent on photos). */
export function CarouselArrow({
  direction,
  onClick,
  tone = 'brand',
  className,
  label,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  tone?: 'brand' | 'glass'
  className?: string
  label?: string
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? (direction === 'prev' ? 'Previous slide' : 'Next slide')}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-95',
        tone === 'brand' ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-white/25 text-white backdrop-blur hover:bg-white/40',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  )
}

export function CarouselDots({
  count,
  index,
  onSelect,
  tone = 'brand',
  label = 'Slide',
}: {
  count: number
  index: number
  onSelect: (i: number) => void
  tone?: 'brand' | 'light'
  label?: string
}) {
  if (count < 2) return null
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`${label} ${i + 1} of ${count}`}
          aria-current={i === index}
          className={cn(
            'size-3 rounded-full transition',
            i === index ? 'bg-brand' : tone === 'light' ? 'bg-white' : 'bg-[#d9d9d9] hover:bg-[#bdbdbd]',
          )}
        />
      ))}
    </div>
  )
}
