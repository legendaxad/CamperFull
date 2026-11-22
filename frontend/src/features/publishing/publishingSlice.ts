import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import { MAX_PHOTOS } from '@/constants/camper'
import type { CamperListing, CamperPhoto, ListingStatus } from '@/types/camper'
import { createEmptyDraft, listingToDraft } from './draftMappers'
import { publishListing, type PublishRejection } from './publishingThunks'
import {
  WIZARD_STEP_IDS,
  type DraftSectionKey,
  type ListingDraft,
  type WizardSession,
} from './publishingTypes'

/*
 * Publishing wizard state.
 * - `session`: the listing currently open in the wizard (autosaved on every change).
 * - `drafts`: sessions the user explicitly parked with "Save as draft".
 * Only serializable data lives here; File objects and object URLs stay in component state.
 */
export interface PublishingState {
  session: WizardSession | null
  drafts: WizardSession[]
  /** Listings completed in the wizard — stored locally only (see publishingThunks.ts). */
  listings: CamperListing[]
  publishStatus: 'idle' | 'pending'
  publishError: PublishRejection | null
}

const initialState: PublishingState = {
  session: null,
  drafts: [],
  listings: [],
  publishStatus: 'idle',
  publishError: null,
}

const LAST_STEP = WIZARD_STEP_IDS.length - 1

function touch(session: WizardSession) {
  session.updatedAt = new Date().toISOString()
}

function ensureSingleCover(photos: CamperPhoto[]) {
  if (photos.length && !photos.some((p) => p.isCover)) photos[0]!.isCover = true
}

/** A brand-new session the user never typed into — not worth keeping as a draft. */
export function isPristine(session: WizardSession): boolean {
  const { basics, photos, features } = session.data
  return (
    !session.editingListingId &&
    !basics.title.trim() &&
    !basics.brand.trim() &&
    !basics.description.trim() &&
    photos.length === 0 &&
    features.length === 0
  )
}

/** Moves the open session into `drafts` (insert or replace) so no work is ever lost. */
function parkSession(state: PublishingState) {
  if (!state.session) return
  const session = state.session
  if (isPristine(session)) {
    state.session = null
    return
  }
  const index = state.drafts.findIndex((d) => d.id === session.id)
  if (index === -1) state.drafts.unshift(session)
  else state.drafts[index] = session
  state.session = null
}

const publishingSlice = createSlice({
  name: 'publishing',
  initialState,
  reducers: {
    startNewListing: {
      reducer(state, action: PayloadAction<{ id: string; ownerId: string; now: string }>) {
        const { id, ownerId, now } = action.payload
        parkSession(state)
        state.session = {
          id,
          ownerId,
          editingListingId: null,
          data: createEmptyDraft(),
          currentStep: 0,
          furthestStep: 0,
          startedAt: now,
          updatedAt: now,
        }
        state.publishError = null
      },
      prepare(ownerId: string) {
        return { payload: { id: `camper-${nanoid(10)}`, ownerId, now: new Date().toISOString() } }
      },
    },
    startEditingListing: {
      reducer(state, action: PayloadAction<{ listing: CamperListing; now: string }>) {
        const { listing, now } = action.payload
        if (state.session?.editingListingId === listing.id) return // already editing it
        parkSession(state)
        state.session = {
          id: `edit-${listing.id}`,
          ownerId: listing.owner.id,
          editingListingId: listing.id,
          data: listingToDraft(listing),
          currentStep: 0,
          furthestStep: LAST_STEP,
          startedAt: now,
          updatedAt: now,
        }
        state.publishError = null
      },
      prepare(listing: CamperListing) {
        return { payload: { listing, now: new Date().toISOString() } }
      },
    },
    resumeDraft(state, action: PayloadAction<string>) {
      const draft = state.drafts.find((d) => d.id === action.payload)
      if (draft) {
        if (state.session && state.session.id !== draft.id) parkSession(state)
        state.session = structuredClone(draft)
        state.publishError = null
      }
    },
    /** Merges raw form values for one section (used by autosave and step submit). */
    updateSection: {
      reducer(state, action: PayloadAction<{ section: DraftSectionKey; data: unknown }>) {
        if (!state.session) return
        const { section, data } = action.payload
        ;(state.session.data as Record<DraftSectionKey, unknown>)[section] = data
        touch(state.session)
      },
      prepare<K extends DraftSectionKey>(section: K, data: ListingDraft[K]) {
        return { payload: { section, data: data as unknown } }
      },
    },
    goToStep(state, action: PayloadAction<number>) {
      if (!state.session) return
      const step = Math.min(Math.max(action.payload, 0), LAST_STEP)
      state.session.currentStep = step
      state.session.furthestStep = Math.max(state.session.furthestStep, step)
    },
    addPhotos(state, action: PayloadAction<CamperPhoto[]>) {
      if (!state.session) return
      const photos = state.session.data.photos
      const room = MAX_PHOTOS - photos.length
      photos.push(...action.payload.slice(0, Math.max(0, room)).map((p) => ({ ...p, isCover: false })))
      ensureSingleCover(photos)
      touch(state.session)
    },
    removePhoto(state, action: PayloadAction<string>) {
      if (!state.session) return
      state.session.data.photos = state.session.data.photos.filter((p) => p.id !== action.payload)
      ensureSingleCover(state.session.data.photos)
      touch(state.session)
    },
    setCoverPhoto(state, action: PayloadAction<string>) {
      if (!state.session) return
      for (const photo of state.session.data.photos) photo.isCover = photo.id === action.payload
      touch(state.session)
    },
    reorderPhoto(state, action: PayloadAction<{ id: string; toIndex: number }>) {
      if (!state.session) return
      const photos = state.session.data.photos
      const from = photos.findIndex((p) => p.id === action.payload.id)
      const to = Math.min(Math.max(action.payload.toIndex, 0), photos.length - 1)
      if (from === -1 || from === to) return
      const [moved] = photos.splice(from, 1)
      photos.splice(to, 0, moved!)
      touch(state.session)
    },
    /** Parks the open session in `drafts` (insert or replace) and closes the wizard. */
    saveSessionAsDraft(state) {
      if (!state.session) return
      touch(state.session)
      parkSession(state)
    },
    discardSession(state) {
      state.session = null
      state.publishError = null
    },
    deleteDraft(state, action: PayloadAction<string>) {
      state.drafts = state.drafts.filter((d) => d.id !== action.payload)
      if (state.session?.id === action.payload) state.session = null
    },
    setListingStatus(state, action: PayloadAction<{ id: string; status: ListingStatus }>) {
      const listing = state.listings.find((l) => l.id === action.payload.id)
      if (!listing) return
      listing.status = action.payload.status
      listing.updatedAt = new Date().toISOString()
    },
    deleteListing(state, action: PayloadAction<string>) {
      state.listings = state.listings.filter((l) => l.id !== action.payload)
    },
    clearPublishError(state) {
      state.publishError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(publishListing.pending, (state) => {
        state.publishStatus = 'pending'
        state.publishError = null
      })
      .addCase(publishListing.fulfilled, (state, action) => {
        state.publishStatus = 'idle'
        const index = state.listings.findIndex((l) => l.id === action.payload.id)
        if (index === -1) state.listings.unshift(action.payload)
        else state.listings[index] = action.payload
        const sessionId = state.session?.id
        state.drafts = state.drafts.filter((d) => d.id !== sessionId)
        state.session = null
      })
      .addCase(publishListing.rejected, (state, action) => {
        state.publishStatus = 'idle'
        state.publishError = action.payload ?? { message: 'Publishing failed.', stepIndex: null }
        if (state.session && action.payload?.stepIndex != null) {
          state.session.currentStep = action.payload.stepIndex
        }
      })
  },
})

export const {
  startNewListing,
  startEditingListing,
  resumeDraft,
  updateSection,
  goToStep,
  addPhotos,
  removePhoto,
  setCoverPhoto,
  reorderPhoto,
  saveSessionAsDraft,
  discardSession,
  deleteDraft,
  setListingStatus,
  deleteListing,
  clearPublishError,
} = publishingSlice.actions

export default publishingSlice.reducer
