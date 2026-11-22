import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { PageLoader } from '@/components/common/PageLoader'
import { ROUTES } from '@/constants/navigation'
import { selectAuthStatus } from '@/features/auth/authSlice'

export interface RedirectState {
  from?: string
}

/**
 * Customer-only pages. While the initial session check (GET /auth/me) is running we show
 * a loader instead of redirecting, so refreshing a protected page keeps the user there.
 * The backend only issues customer sessions on this site (admins use their own app).
 */
export function ProtectedRoute() {
  const status = useAppSelector(selectAuthStatus)
  const location = useLocation()
  if (status === 'unknown') return <PageLoader label="Checking your session…" />
  if (status === 'anonymous') {
    const state: RedirectState = { from: location.pathname + location.search }
    return <Navigate to={ROUTES.signIn} replace state={state} />
  }
  return <Outlet />
}

/** Keeps signed-in users away from the sign-in / register screens. */
export function GuestOnlyRoute() {
  const status = useAppSelector(selectAuthStatus)
  const location = useLocation()
  if (status === 'unknown') return <PageLoader label="Checking your session…" />
  if (status === 'authenticated') {
    const from = (location.state as RedirectState | null)?.from
    return <Navigate to={from ?? ROUTES.home} replace />
  }
  return <Outlet />
}
