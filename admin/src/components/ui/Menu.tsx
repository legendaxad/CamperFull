import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { useDismiss } from '@/hooks/common'
import { cn } from '@/utils/cn'

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' | 'dialog' }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  className?: string
  kind?: 'menu' | 'dialog'
}

/** Anchored popover with outside-click / Escape dismissal and an entrance animation. */
export function Popover({ trigger, children, align = 'right', className, kind = 'menu' }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)
  useDismiss(open, close, [rootRef])

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle: () => setOpen((value) => !value), 'aria-expanded': open, 'aria-haspopup': kind })}
      <AnimatePresence>
        {open && (
          <motion.div
            role={kind}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 36 }}
            style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
            className={cn(
              'absolute top-full z-40 mt-2 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-lg',
              align === 'right' ? 'right-0' : 'left-0',
              className,
            )}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MenuItem({ icon, children, onClick, danger }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
        danger ? 'text-danger hover:bg-danger-soft' : 'text-fg-2 hover:bg-muted hover:text-fg',
      )}
    >
      {icon && <span className="flex h-4 w-4 items-center justify-center text-fg-3 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      {children}
    </button>
  )
}
