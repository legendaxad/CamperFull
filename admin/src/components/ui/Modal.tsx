import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Blocks closing via backdrop/Escape while a request is running. */
  busy?: boolean
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }

/**
 * Accessible dialog: focus moves in on open and back on close, Tab is trapped,
 * Escape and the backdrop close it, body scroll is locked. On phones it
 * becomes a bottom sheet.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => {
    closeRef.current = onClose
    busyRef.current = busy
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])') ?? panel
      target?.focus()
    }, 30)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.stopPropagation()
        closeRef.current()
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusable = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        )
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => !busy && onClose()}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-lg outline-none sm:rounded-2xl',
              SIZES[size],
            )}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="mt-1 text-[13px] text-fg-3">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                data-close
                onClick={onClose}
                disabled={busy}
                className="-mr-1.5 rounded-md p-1.5 text-fg-3 transition-colors hover:bg-muted hover:text-fg disabled:opacity-40"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-subtle px-5 py-3 sm:rounded-b-2xl">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
