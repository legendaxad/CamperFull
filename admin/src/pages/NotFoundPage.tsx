import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/common'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-fg">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-sm text-fg-3">The page you're looking for doesn't exist or has moved.</p>
      <ButtonLink to="/" variant="primary" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </div>
  )
}
