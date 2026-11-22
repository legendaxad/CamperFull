import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

function pageWindow(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) result.push('gap')
    result.push(p)
  })
  return result
}

export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null
  const btn = 'flex size-10 items-center justify-center rounded-[10px] text-sm font-semibold transition'
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
      <button type="button" className={cn(btn, 'hover:bg-white disabled:opacity-40')} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-5" />
      </button>
      {pageWindow(page, total).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(btn, p === page ? 'bg-brand text-white' : 'bg-white text-ink shadow-card hover:text-brand')}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(btn, 'hover:bg-white disabled:opacity-40')} onClick={() => onChange(page + 1)} disabled={page >= total} aria-label="Next page">
        <ChevronRight className="size-5" />
      </button>
    </nav>
  )
}
