import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/common/Toaster'
import { useAppBootstrap } from '@/hooks/useAppBootstrap'
import { Footer } from './Footer'
import { Header } from './Header'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export function AppLayout() {
  useAppBootstrap()
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[90] rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
    </div>
  )
}
