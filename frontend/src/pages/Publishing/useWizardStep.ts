import { useCallback, useEffect } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { selectCurrentStep } from '@/features/publishing/publishingSelectors'
import { goToStep, updateSection } from '@/features/publishing/publishingSlice'
import type { DraftSectionKey, ListingDraft } from '@/features/publishing/publishingTypes'

/**
 * Autosave: mirrors every change of a step form into the persisted wizard session,
 * so navigating between steps, refreshing or closing the tab never loses input.
 * Dispatches are cheap; redux-persist throttles the actual storage writes.
 */
export function useAutosaveSection<K extends DraftSectionKey, T extends FieldValues, Out>(
  section: K,
  form: UseFormReturn<T, unknown, Out>,
  toDraft: (values: T) => ListingDraft[K],
): void {
  const dispatch = useAppDispatch()
  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => dispatch(updateSection(section, toDraft(values as T))),
    })
    return unsubscribe
  }, [dispatch, form, section, toDraft])
}

/** Stable identity mapper for steps whose form values already match the draft shape. */
export const sameShape = <V,>(values: V): V => values

/** Navigation helpers shared by all steps. */
export function useWizardNavigation() {
  const dispatch = useAppDispatch()
  const current = useAppSelector(selectCurrentStep)
  const next = useCallback(() => {
    dispatch(goToStep(current + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dispatch, current])
  const back = useCallback(() => {
    dispatch(goToStep(current - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [dispatch, current])
  const goTo = useCallback(
    (step: number) => {
      dispatch(goToStep(step))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [dispatch],
  )
  return { current, next, back, goTo }
}
