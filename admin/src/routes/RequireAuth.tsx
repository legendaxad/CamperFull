import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { ErrorState, Spinner } from '@/components/ui/Feedback'
import { useCurrentAdmin } from '@/features/auth/useCurrentAdmin'
import { errorStatus } from '@/services/errors'
import { useMeQuery } from '@/services/endpoints'
import type { MemberRole } from '@/types/api'

/** Loads the admin session; unauthenticated visitors go to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { data, error, isLoading, refetch } = useMeQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4" role="status">
        <LogoMark className="h-10 w-10" />
        <Spinner />
        <span className="sr-only">Loading your session…</span>
      </div>
    )
  }

  if (error) {
    const status = errorStatus(error)
    if (status === 401 || status === 403) {
      const next = `${location.pathname}${location.search}`
      return <Navigate to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />
    }
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="card w-full max-w-md">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      </div>
    )
  }

  if (!data) return null
  return children
}

/** Hides a page from roles that the backend would reject anyway (e.g. admin management for non-super-admins). */
export function RequireRole({ roles, children }: { roles: MemberRole[]; children: ReactNode }) {
  const admin = useCurrentAdmin()
  if (roles.includes(admin.role)) return children
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <p className="text-base font-semibold text-fg">Restricted area</p>
      <p className="mt-2 text-sm text-fg-3">Only a super administrator can manage administrator accounts.</p>
      <Button className="mt-5" onClick={() => history.back()}>
        Go back
      </Button>
    </div>
  )
}
