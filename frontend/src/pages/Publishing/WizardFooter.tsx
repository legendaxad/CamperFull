import { ArrowLeft, ArrowRight, Rocket, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Button } from '@/components/common/Button'
import { ROUTES } from '@/constants/navigation'
import { selectPublishStatus, selectSession } from '@/features/publishing/publishingSelectors'
import { isPristine, saveSessionAsDraft } from '@/features/publishing/publishingSlice'
import { publishListing } from '@/features/publishing/publishingThunks'
import { showToast } from '@/features/ui/uiSlice'
import { useWizardNavigation } from './useWizardStep'
import { STEP_FORM_ID, WIZARD_STEPS } from './wizardConfig'

/** Sticky action bar: Back · Save as draft · Next / Publish. */
export function WizardFooter() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const session = useAppSelector(selectSession)!
  const publishStatus = useAppSelector(selectPublishStatus)
  const { current, back } = useWizardNavigation()
  const isLast = current === WIZARD_STEPS.length - 1
  const isEditing = session.editingListingId !== null

  const saveDraft = () => {
    if (isPristine(session)) {
      dispatch(showToast('Add a few details before saving a draft.', 'info'))
      return
    }
    dispatch(saveSessionAsDraft())
    dispatch(showToast('Draft saved — you can continue any time from My campers.'))
    navigate(ROUTES.myCampers)
  }

  const publish = async () => {
    const result = await dispatch(publishListing())
    if (publishListing.fulfilled.match(result)) {
      navigate(ROUTES.publishSuccess(result.payload.id), { state: { edited: isEditing } })
    } else {
      dispatch(showToast(result.payload?.message ?? 'Publishing failed.', 'error'))
    }
  }

  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-8 flex items-center gap-2 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:pb-0 md:backdrop-blur-none">
      <Button variant="ghost" onClick={back} disabled={current === 0} icon={<ArrowLeft className="size-4" aria-hidden />} className="px-3 sm:px-5">
        <span className="hidden sm:inline">Back</span>
      </Button>
      <Button variant="outline" onClick={saveDraft} icon={<Save className="size-4" aria-hidden />} className="ml-auto px-3 sm:px-5">
        <span className="hidden min-[400px]:inline">Save draft</span>
      </Button>
      {isLast ? (
        <Button variant="accent" onClick={publish} loading={publishStatus === 'pending'} icon={<Rocket className="size-4" aria-hidden />}>
          {isEditing ? 'Save changes' : 'Publish listing'}
        </Button>
      ) : (
        <Button type="submit" form={STEP_FORM_ID}>
          Next <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )
}
