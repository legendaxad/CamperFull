import { CloudCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ROUTES } from '@/constants/navigation'
import { selectCurrentUser } from '@/features/auth/authSlice'
import { selectCurrentStep, selectSession } from '@/features/publishing/publishingSelectors'
import { discardSession, startNewListing } from '@/features/publishing/publishingSlice'
import { showToast } from '@/features/ui/uiSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/utils/format'
import { LivePreviewCard } from './LivePreviewCard'
import { BasicsStep } from './steps/BasicsStep'
import { FeaturesStep } from './steps/FeaturesStep'
import { LocationStep } from './steps/LocationStep'
import { PhotosStep } from './steps/PhotosStep'
import { PreviewStep } from './steps/PreviewStep'
import { PricingStep } from './steps/PricingStep'
import { SpecsStep } from './steps/SpecsStep'
import { WizardFooter } from './WizardFooter'
import { WizardStepper } from './WizardStepper'
import { WIZARD_STEPS } from './wizardConfig'

const STEP_COMPONENTS = [BasicsStep, SpecsStep, FeaturesStep, PhotosStep, LocationStep, PricingStep, PreviewStep]

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Camper publishing wizard (new flow — not designed in Figma; built from its tokens & components).
 * The page guarantees a wizard session exists for the signed-in user, then renders the current step.
 */
export default function PublishPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)!
  const session = useAppSelector(selectSession)
  const current = useAppSelector(selectCurrentStep)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const ownsSession = session?.ownerId === user._id
  const isEditing = Boolean(session?.editingListingId)
  useDocumentTitle(isEditing ? 'Edit listing' : 'List your camper')

  // Start (or replace another user's) session on arrival.
  useEffect(() => {
    if (!session || !ownsSession) dispatch(startNewListing(user._id))
  }, [dispatch, session, ownsSession, user._id])

  if (!session || !ownsSession) return null

  const meta = WIZARD_STEPS[current]!
  const StepComponent = STEP_COMPONENTS[current]!
  const StepIcon = meta.icon

  const discard = () => {
    dispatch(discardSession())
    setConfirmDiscard(false)
    dispatch(showToast(isEditing ? 'Changes discarded' : 'Listing discarded', 'info'))
    navigate(isEditing ? ROUTES.myCampers : ROUTES.home)
  }

  return (
    <div className="bg-gradient-to-b from-brand-soft/70 to-surface">
      <div className="container-page py-8 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-accent">{isEditing ? 'Edit listing' : 'New listing'}</p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">{isEditing ? 'Update your camper' : 'List your camper'}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
              {/* Wizard data never leaves the browser — see publishingThunks.ts. */}
              <CloudCheck className="size-4 text-success" aria-hidden />
              Autosaved on this device · {formatDate(session.updatedAt)} {timeOf(session.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-danger hover:bg-white"
          >
            <Trash2 className="size-4" aria-hidden /> {isEditing ? 'Discard changes' : 'Discard'}
          </button>
        </header>

        <div className="mt-8">
          <WizardStepper />
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-[24px] bg-white px-5 pt-6 pb-0 shadow-card sm:px-8 sm:pt-8 md:pb-8" aria-labelledby="step-title">
            <div className="mb-6 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <StepIcon className="size-6" aria-hidden />
              </span>
              <div>
                <h2 id="step-title" className="text-xl font-semibold md:text-2xl">{meta.title}</h2>
                <p className="mt-1 text-sm text-muted">{meta.description}</p>
              </div>
            </div>
            <div key={current} className="animate-fade-in">
              <StepComponent />
            </div>
            <WizardFooter />
          </section>
          <div className="hidden lg:block">
            <div className="sticky top-[118px]">
              <LivePreviewCard />
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title={isEditing ? 'Discard your changes?' : 'Discard this listing?'}
        description={isEditing ? 'Your published listing stays unchanged.' : 'Everything you entered in this wizard will be deleted. Saved drafts are not affected.'}
        confirmLabel="Discard"
        onConfirm={discard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
