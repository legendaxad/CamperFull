import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'

const LANGUAGES = [
  { code: 'en', label: 'English', available: true },
  { code: 'ko', label: '한국어 (coming soon)', available: false },
]

/** "En" selector from the Figma nav. Only English ships today; Korean is announced. */
export function LanguageMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, open, close)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language: English"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-2 py-2 text-base font-medium text-ink hover:bg-surface"
      >
        En <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Language" className="absolute top-full right-0 z-50 mt-2 w-52 animate-fade-in rounded-[14px] bg-white p-2 shadow-raised">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang.code === 'en'}
              disabled={!lang.available}
              onClick={close}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:font-normal disabled:text-muted disabled:hover:bg-transparent"
            >
              {lang.label}
              {lang.code === 'en' && <Check className="size-4 text-brand" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
