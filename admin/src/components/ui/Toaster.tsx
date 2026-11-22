import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { ToastContext, type ToastKind } from './toastContext'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const ICON_COLORS = { success: 'text-success', error: 'text-danger', info: 'text-info' }

/** Success/error feedback for mutations. Announced to screen readers via a live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const show = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, kind, message }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000))
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({ success: (m: string) => show(m, 'success'), error: (m: string) => show(m, 'error'), info: (m: string) => show(m, 'info') }),
    [show],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end" aria-live="polite" role="status">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => {
              const Icon = ICONS[toast.kind]
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-lg"
                >
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_COLORS[toast.kind])} aria-hidden />
                  <p className="min-w-0 flex-1 text-sm text-fg">{toast.message}</p>
                  <button type="button" onClick={() => dismiss(toast.id)} className="-mr-1 rounded p-0.5 text-fg-3 hover:text-fg" aria-label="Dismiss notification">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
