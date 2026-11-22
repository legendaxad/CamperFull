import { AlertTriangle, Inbox, Lock, RotateCw, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { describeError, errorStatus } from '@/services/errors'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  compact = false,
}: {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14', className)}>
      <div className={cn('flex items-center justify-center rounded-full bg-muted text-fg-3', compact ? 'h-9 w-9' : 'h-12 w-12')}>
        {icon ?? <Inbox className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />}
      </div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {description && <p className="mt-1 text-[13px] text-fg-3">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Error state for a failed query, with a retry action and status-specific wording. */
export function ErrorState({ error, onRetry, className, compact = false }: { error: unknown; onRetry?: () => void; className?: string; compact?: boolean }) {
  const status = errorStatus(error)
  const icon = status === 404 ? <SearchX className="h-5 w-5" /> : status === 403 ? <Lock className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />
  const title = status === 404 ? 'Not found' : status === 403 ? 'Access denied' : 'Could not load data'
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)} role="alert">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">{icon}</div>
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mt-1 text-[13px] text-fg-3">{describeError(error)}</p>
      </div>
      {onRetry && status !== 404 && status !== 403 && (
        <Button size="sm" onClick={onRetry} icon={<RotateCw className="h-3.5 w-3.5" />}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent', className)} aria-hidden />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-fg-3" role="status">
      <Spinner />
      {label}
    </div>
  )
}
