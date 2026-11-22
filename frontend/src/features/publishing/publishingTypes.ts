import type { z } from 'zod'
import type {
  basicsSchema,
  feeSchema,
  featuresSchema,
  listingDraftSchema,
  locationSchema,
  pricingSchema,
  specsSchema,
} from './publishingSchemas'

/** Raw (string-based) form values persisted while the user works through the wizard. */
export type BasicsDraft = z.input<typeof basicsSchema>
export type SpecsDraft = z.input<typeof specsSchema>
export type FeaturesDraft = z.input<typeof featuresSchema>
export type LocationDraft = z.input<typeof locationSchema>
export type PricingDraft = z.input<typeof pricingSchema>
export type FeeDraft = z.input<typeof feeSchema>
export type ListingDraft = z.input<typeof listingDraftSchema>

/** Parsed, typed values produced after validation. */
export type BasicsValues = z.output<typeof basicsSchema>
export type SpecsValues = z.output<typeof specsSchema>
export type FeaturesValues = z.output<typeof featuresSchema>
export type LocationValues = z.output<typeof locationSchema>
export type PricingValues = z.output<typeof pricingSchema>
export type ListingValues = z.output<typeof listingDraftSchema>

export type DraftSectionKey = keyof ListingDraft

export const WIZARD_STEP_IDS = [
  'basics',
  'specs',
  'features',
  'photos',
  'location',
  'pricing',
  'preview',
] as const
export type WizardStepId = (typeof WIZARD_STEP_IDS)[number]

/** A wizard run — either in progress (`session`) or parked as a saved draft. */
export interface WizardSession {
  id: string
  ownerId: string
  /** Set when the session edits an existing listing instead of creating a new one. */
  editingListingId: string | null
  data: ListingDraft
  currentStep: number
  furthestStep: number
  startedAt: string
  updatedAt: string
}
