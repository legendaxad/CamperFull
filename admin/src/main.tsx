import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { store } from '@/app/store'
import { PageLoader } from '@/components/ui/Feedback'
import { ToastProvider } from '@/components/ui/Toaster'
import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { router } from '@/routes/router'
import { api } from '@/services/api'
import { setSessionExpiredHandler } from '@/services/httpClient'
import '@/styles/index.css'

// When the refresh token is rejected, clear cached data and go to the login page once.
setSessionExpiredHandler(() => {
  if (router.state.location.pathname === '/login') return
  const next = `${router.state.location.pathname}${router.state.location.search}`
  void router.navigate(`/login?expired=1&next=${encodeURIComponent(next)}`, { replace: true }).then(() => store.dispatch(api.util.resetApiState()))
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        {/* "user": animations are reduced automatically when the OS asks for reduced motion. */}
        <MotionConfig reducedMotion="user">
          <ToastProvider>
            <Suspense fallback={<PageLoader />}>
              <RouterProvider router={router} />
            </Suspense>
          </ToastProvider>
        </MotionConfig>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
