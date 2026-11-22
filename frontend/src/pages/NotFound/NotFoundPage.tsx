import { MapPinOff } from 'lucide-react'
import { ButtonLink } from '@/components/common/Button'
import { EmptyState } from '@/components/common/Feedback'
import { ROUTES } from '@/constants/navigation'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <div className="container-page py-16 md:py-24">
      <EmptyState
        icon={MapPinOff}
        title="This road doesn't lead anywhere"
        description="The page you're looking for was moved, removed or never existed."
        action={
          <>
            <ButtonLink to={ROUTES.home}>Back to home</ButtonLink>
            <ButtonLink to={ROUTES.campers} variant="outline">
              Browse campers
            </ButtonLink>
          </>
        }
      />
    </div>
  )
}
