import { AlertTriangle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center rounded-[20px] bg-white px-6 py-14 text-center shadow-card',
        className,
      )}
    >
      <span className="mb-4 flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description={message}
      action={onRetry && <Button onClick={onRetry}>Try again</Button>}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: ReactNode
  tone?: 'brand' | 'accent' | 'success' | 'muted' | 'danger'
  className?: string
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand',
    accent: 'bg-accent text-white',
    success: 'bg-[#e8f5e9] text-success',
    muted: 'bg-[#efefef] text-muted',
    danger: 'bg-[#fdecea] text-danger',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
