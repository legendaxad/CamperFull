import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import { fullName } from '@/features/auth/authSlice'
import type { CamperListing } from '@/types/camper'
import { buildListing } from './draftMappers'
import { listingDraftSchema } from './publishingSchemas'
import { WIZARD_STEP_IDS, type DraftSectionKey } from './publishingTypes'

export interface PublishRejection {
  message: string
  /** Wizard step holding the first invalid field, so the UI can jump straight to it. */
  stepIndex: number | null
}

function stepIndexForSection(section: PropertyKey | undefined): number | null {
  const index = WIZARD_STEP_IDS.indexOf(section as DraftSectionKey)
  return index === -1 ? null : index
}

/**
 * Validates the whole wizard session and saves it as a LOCAL listing.
 * The backend has no customer camper-listing endpoint yet (campers are created by admins),
 * so listings are kept in this browser and are not shown in the marketplace.
 */
export const publishListing = createAppAsyncThunk<
  CamperListing,
  void,
  { rejectValue: PublishRejection }
>('publishing/publish', async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const session = state.publishing.session
  const user = state.auth.user
  if (!session) return rejectWithValue({ message: 'There is no listing in progress.', stepIndex: null })
  if (!user) return rejectWithValue({ message: 'Please sign in to publish your camper.', stepIndex: null })

  const parsed = listingDraftSchema.safeParse(session.data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return rejectWithValue({
      message: first ? `${first.message}.` : 'Some information is missing.',
      stepIndex: stepIndexForSection(first?.path[0]),
    })
  }

  const listingId = session.editingListingId ?? session.id
  const existing = state.publishing.listings.find((l) => l.id === listingId) ?? null
  const listing = buildListing(parsed.data, {
    id: listingId,
    owner: { id: user._id, name: fullName(user), avatarUrl: user.avatar?.url ?? null },
    existing,
    now: new Date().toISOString(),
  })

  return listing
})
