import { useState } from 'react'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' }

export function Avatar({ name, src, size = 'sm', className }: { name: string; src?: string; size?: keyof typeof SIZES; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-semibold text-accent-ink ring-1 ring-line', SIZES[size], className)}>
      {src && !failed ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} loading="lazy" /> : initials(name) || '?'}
    </span>
  )
}

/** Camper thumbnail with a graceful placeholder. */
export function Thumb({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-line', className)}>
      {src && !failed ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-fg-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 16.5V9a2 2 0 0 1 2-2h9.5a2 2 0 0 1 1.7.9l3.1 4.5c.2.3.3.7.3 1.1v3" strokeLinecap="round" />
          <circle cx="7" cy="17" r="1.8" />
          <circle cx="16.5" cy="17" r="1.8" />
        </svg>
      )}
    </span>
  )
}
