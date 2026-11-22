import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

/** Accessible dialog matching the Figma "Name of the video" modal (white card, 20px radius). */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-slide-up flex-col rounded-t-[20px] bg-white shadow-raised outline-none sm:rounded-[20px]',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
          <h2 id={titleId} className="text-lg font-bold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mt-1 -mr-2 rounded-full p-2 text-ink transition hover:bg-black/5"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
