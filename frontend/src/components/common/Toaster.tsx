import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { dismissToast, selectToasts, type Toast } from '@/features/ui/uiSlice'
import { cn } from '@/utils/cn'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const TONES = { success: 'text-success', error: 'text-danger', info: 'text-brand' }
const AUTO_DISMISS_MS = 4200

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch()
  const Icon = ICONS[toast.tone]

  useEffect(() => {
    const timer = window.setTimeout(() => dispatch(dismissToast(toast.id)), AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [dispatch, toast.id])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full animate-slide-up items-start gap-3 rounded-[14px] bg-white p-4 text-sm shadow-raised"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', TONES[toast.tone])} aria-hidden />
      <p className="flex-1 font-medium text-ink">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="-m-1 rounded-full p-1 text-muted hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useAppSelector(selectToasts)
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
