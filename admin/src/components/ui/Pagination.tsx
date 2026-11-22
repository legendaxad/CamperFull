import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@/types/api'
import { formatNumber } from '@/utils/format'
import { Button } from './Button'

export function Pagination({ meta, onPageChange, label = 'results' }: { meta: PaginationMeta | undefined; onPageChange: (page: number) => void; label?: string }) {
  if (!meta || meta.total === 0) return null
  const first = (meta.page - 1) * meta.limit + 1
  const last = Math.min(meta.page * meta.limit, meta.total)
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-5 py-3" aria-label="Pagination">
      <p className="text-[13px] text-fg-3 tabular">
        <span className="font-medium text-fg-2">
          {formatNumber(first)}–{formatNumber(last)}
        </span>{' '}
        of {formatNumber(meta.total)} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="mr-1 hidden text-[13px] text-fg-3 tabular sm:inline">
          Page {meta.page} of {meta.totalPages}
        </span>
        <Button size="icon-sm" variant="secondary" disabled={!meta.hasPrevPage} onClick={() => onPageChange(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="icon-sm" variant="secondary" disabled={!meta.hasNextPage} onClick={() => onPageChange(meta.page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
