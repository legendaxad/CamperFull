import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { PageLoader } from '../ui/Feedback'
import { Logo } from './Logo'
import { Sidebar, SidebarNav } from './Sidebar'
import { Topbar } from './Topbar'

const COLLAPSE_KEY = 'fc-admin-sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !value
    })
  }

  // Close the drawer when the route changes (including back/forward), derived during render.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
  }
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [mobileOpen])

  // Pages keyed by their first path segment, so tab/filter changes inside a page don't re-animate it.
  const pageKey = location.pathname.split('/').slice(0, 3).join('/')

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} />

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} aria-hidden />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-nav shadow-lg"
            >
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-fg-3 hover:bg-muted hover:text-fg" aria-label="Close navigation">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarNav collapsed={false} layoutScope="mobile" onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="mx-auto w-full max-w-[1440px]"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
