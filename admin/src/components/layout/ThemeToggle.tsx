import { Moon, Sun } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTheme } from '@/features/theme/themeContext'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--radius-control)] text-fg-2 transition-colors hover:bg-muted hover:text-fg"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -14, opacity: 0, rotate: -60 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 14, opacity: 0, rotate: 60 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex"
        >
          {dark ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
