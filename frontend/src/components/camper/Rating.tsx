import starIcon from '@/assets/icons/star.svg'
import { cn } from '@/utils/cn'

/** Orange star + score (Figma card: 14px "bx:bxs-star" icon, 12px text). */
export function Rating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!value) {
    return <span className={cn('text-xs font-medium text-accent', className)}>New</span>
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-ink', className)}>
      <img src={starIcon} alt="" width={14} height={14} />
      <span>
        <span className="sr-only">Rated </span>
        {value.toFixed(1)}
        {count !== undefined && <span className="text-muted"> ({count})</span>}
      </span>
    </span>
  )
}
