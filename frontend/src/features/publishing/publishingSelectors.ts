import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import {
  basicsSchema,
  featuresSchema,
  locationSchema,
  photosSchema,
  pricingSchema,
  specsSchema,
} from './publishingSchemas'
import { WIZARD_STEP_IDS, type WizardStepId } from './publishingTypes'

export const selectSession = (state: RootState) => state.publishing.session
export const selectSessionData = (state: RootState) => state.publishing.session?.data ?? null
export const selectCurrentStep = (state: RootState) => state.publishing.session?.currentStep ?? 0
export const selectPublishStatus = (state: RootState) => state.publishing.publishStatus
export const selectPublishError = (state: RootState) => state.publishing.publishError
export const selectSessionPhotos = (state: RootState) => state.publishing.session?.data.photos ?? []

export const selectMyDrafts = createSelector(
  [(state: RootState) => state.publishing.drafts, (state: RootState) => state.auth.user?._id],
  (drafts, userId) => (userId ? drafts.filter((d) => d.ownerId === userId) : []),
)

/**
 * Derived per-step validity — computed from the draft instead of stored, so it can never
 * drift out of sync with the form data.
 */
export const selectStepValidity = createSelector([selectSessionData], (data) => {
  const validity = Object.fromEntries(WIZARD_STEP_IDS.map((id) => [id, false])) as Record<
    WizardStepId,
    boolean
  >
  if (!data) return validity
  validity.basics = basicsSchema.safeParse(data.basics).success
  validity.specs = specsSchema.safeParse(data.specs).success
  validity.features = featuresSchema.safeParse({ features: data.features }).success
  validity.photos = photosSchema.safeParse(data.photos).success
  validity.location = locationSchema.safeParse(data.location).success
  validity.pricing = pricingSchema.safeParse(data.pricing).success
  validity.preview = WIZARD_STEP_IDS.slice(0, -1).every((id) => validity[id])
  return validity
})

export const selectCompletion = createSelector([selectStepValidity], (validity) => {
  const steps = WIZARD_STEP_IDS.slice(0, -1)
  const done = steps.filter((id) => validity[id]).length
  return Math.round((done / steps.length) * 100)
})

export const selectMyLocalListings = createSelector(
  [(state: RootState) => state.publishing.listings, (state: RootState) => state.auth.user?._id],
  (listings, userId) => (userId ? listings.filter((l) => l.owner.id === userId) : []),
)

export const selectLocalListingById = (state: RootState, id: string | undefined) =>
  id ? state.publishing.listings.find((l) => l.id === id) : undefined
