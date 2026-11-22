import { AlertTriangle, RotateCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button, ButtonLink } from '@/components/ui/Button'

/** Shown instead of a page that crashed while rendering; the shell (navigation) stays usable. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (import.meta.env.DEV) console.error(error)
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center" role="alert">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-fg">{notFound ? 'Page not found' : 'This page ran into a problem'}</h1>
      <p className="mt-1.5 max-w-sm text-sm text-fg-3">
        {notFound ? "The page you're looking for doesn't exist." : 'Something unexpected happened while showing this page. Reloading usually fixes it.'}
      </p>
      <div className="mt-6 flex gap-2">
        <Button icon={<RotateCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
          Reload
        </Button>
        <ButtonLink to="/" variant="primary">
          Back to dashboard
        </ButtonLink>
      </div>
    </div>
  )
}
