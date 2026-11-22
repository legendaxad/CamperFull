import { CheckCircle2, LayoutDashboard, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { ButtonLink } from '@/components/common/Button'
import { ROUTES } from '@/constants/navigation'
import { LocalListingCard, LocalOnlyNotice } from '@/components/publishing/LocalListing'
import { selectLocalListingById } from '@/features/publishing/publishingSelectors'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import NotFoundPage from '../NotFound/NotFoundPage'

const REDIRECT_SECONDS = 8

/** Confirmation after publishing; continues to "My campers" automatically. */
export default function PublishSuccessPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const edited = (location.state as { edited?: boolean } | null)?.edited ?? false
  const camper = useAppSelector((state) => selectLocalListingById(state, id))
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS)
  useDocumentTitle(edited ? 'Listing updated' : 'Listing published')

  useEffect(() => {
    if (!camper) return
    if (seconds <= 0) {
      navigate(ROUTES.myCampers, { replace: true })
      return
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [camper, seconds, navigate])

  if (!camper) return <NotFoundPage />

  return (
    <div className="bg-gradient-to-b from-brand-soft/70 to-surface">
      <div className="container-page grid items-center gap-10 py-14 md:grid-cols-[1.2fr_1fr] md:py-20">
        <div className="animate-slide-up">
          <span className="flex size-16 items-center justify-center rounded-full bg-success text-white shadow-raised">
            <CheckCircle2 className="size-9" aria-hidden />
          </span>
          <h1 className="mt-6 text-3xl font-bold md:text-[44px] md:leading-tight">
            {edited ? 'Your changes are saved!' : 'Your listing is ready!'}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            <strong className="text-ink">{camper.basics.title}</strong> has been saved. You can edit, pause or delete it any time from{' '}
            <em>My campers</em>.
          </p>
          <LocalOnlyNotice className="mt-5 max-w-lg" />
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={ROUTES.myCampers} size="lg" icon={<LayoutDashboard className="size-5" aria-hidden />}>
              Go to My campers
            </ButtonLink>
            <ButtonLink to={ROUTES.publish} variant="ghost" size="lg" icon={<Plus className="size-5" aria-hidden />}>
              List another
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-muted" aria-live="polite">
            Redirecting to My campers in {seconds}s…
          </p>
        </div>
        <div className="mx-auto w-full max-w-[300px] animate-fade-in">
          <LocalListingCard listing={camper} />
        </div>
      </div>
    </div>
  )
}
