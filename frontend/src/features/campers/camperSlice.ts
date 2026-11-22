import { createEntityAdapter, createSlice, type EntityState } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import { describeError, toApiError } from '@/services/api/errors'
import { camperApi, catalogApi, type CamperListParams } from '@/services/camperApi'
import type { Camper, CamperFilterOptions, Category, Feature, PaginationMeta } from '@/types/api'

/*
 * Marketplace data from the backend catalog.
 * Campers are normalized by `_id` (with a slug index) so the list, detail, compare and
 * home pages share one copy of each camper and never refetch what is already loaded.
 */

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface Resource<T> {
  data: T
  status: RequestStatus
  error: string | null
}

interface ListState {
  /** Serialized query of the last requested page — used to ignore stale responses. */
  key: string | null
  ids: string[]
  meta: PaginationMeta | null
  status: RequestStatus
  error: string | null
}

export const campersAdapter = createEntityAdapter<Camper, string>({ selectId: (camper) => camper._id })

export interface CamperState {
  entities: EntityState<Camper, string>
  slugToId: Record<string, string>
  listing: ListState
  featured: Resource<string[]>
  /** Per id-or-slug detail request status (404s are remembered to show "not found"). */
  details: Record<string, { status: RequestStatus; error: string | null; notFound: boolean }>
  compare: Resource<string[]> & { key: string | null }
  /** Small per-category previews for the navigation mega-menu. */
  categoryPreviews: Record<string, Resource<string[]>>
  filterOptions: Resource<CamperFilterOptions | null>
  categories: Resource<Category[]>
  features: Resource<Feature[]>
}

const resource = <T>(data: T): Resource<T> => ({ data, status: 'idle', error: null })

const initialState: CamperState = {
  entities: campersAdapter.getInitialState(),
  slugToId: {},
  listing: { key: null, ids: [], meta: null, status: 'idle', error: null },
  featured: resource<string[]>([]),
  details: {},
  compare: { ...resource<string[]>([]), key: null },
  categoryPreviews: {},
  filterOptions: resource<CamperFilterOptions | null>(null),
  categories: resource<Category[]>([]),
  features: resource<Feature[]>([]),
}

export const listingKey = (params: CamperListParams) => JSON.stringify(params)

export const fetchCampers = createAppAsyncThunk(
  'campers/fetchList',
  async (params: CamperListParams, { rejectWithValue, signal }) => {
    try {
      return await camperApi.list(params, signal)
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    // Skip duplicates (StrictMode double effects, re-renders) for the query already loading/loaded.
    condition: (params, { getState }) => {
      const { listing } = getState().campers
      return !(listing.key === listingKey(params) && (listing.status === 'loading' || listing.status === 'succeeded'))
    },
  },
)

export const fetchFeaturedCampers = createAppAsyncThunk(
  'campers/fetchFeatured',
  async (_: void, { rejectWithValue }) => {
    try {
      const featured = await camperApi.list({ featured: true, limit: 12, sort: 'rating' })
      // Fall back to top-rated campers when nothing is marked as featured yet.
      return featured.items.length ? featured.items : (await camperApi.list({ limit: 12, sort: 'rating' })).items
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().campers.featured.status === 'idle' },
)

export const fetchCamperDetail = createAppAsyncThunk<Camper, string, { rejectValue: { message: string; notFound: boolean } }>(
  'campers/fetchDetail',
  async (idOrSlug, { rejectWithValue }) => {
    try {
      return await camperApi.get(idOrSlug)
    } catch (error) {
      const apiError = toApiError(error)
      return rejectWithValue({ message: apiError.message, notFound: apiError.status === 404 })
    }
  },
  {
    condition: (idOrSlug, { getState }) => {
      const status = getState().campers.details[idOrSlug]?.status
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

export const fetchCompareCampers = createAppAsyncThunk(
  'campers/fetchCompare',
  async (ids: string[], { rejectWithValue }) => {
    try {
      // The compare endpoint needs 2–4 ids; a single camper is loaded through its detail endpoint.
      return ids.length >= 2 ? await camperApi.compare(ids) : ids.length === 1 ? [await camperApi.get(ids[0]!)] : []
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    condition: (ids, { getState }) => {
      const { compare } = getState().campers
      return !(compare.key === ids.join(',') && (compare.status === 'loading' || compare.status === 'succeeded'))
    },
  },
)

export const CATEGORY_PREVIEW_SIZE = 5

export const fetchCategoryPreview = createAppAsyncThunk(
  'campers/fetchCategoryPreview',
  async (slug: string, { rejectWithValue }) => {
    try {
      return (await camperApi.list({ category: slug, limit: CATEGORY_PREVIEW_SIZE, sort: 'popular' })).items
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    condition: (slug, { getState }) => {
      const status = getState().campers.categoryPreviews[slug]?.status
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

export const fetchFilterOptions = createAppAsyncThunk(
  'campers/fetchFilterOptions',
  async (_: void, { rejectWithValue }) => {
    try {
      return await camperApi.filters()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().campers.filterOptions.status === 'idle' },
)

export const fetchCategories = createAppAsyncThunk(
  'campers/fetchCategories',
  async (_: void, { rejectWithValue }) => {
    try {
      return await catalogApi.categories()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().campers.categories.status === 'idle' },
)

export const fetchFeatures = createAppAsyncThunk(
  'campers/fetchFeatures',
  async (_: void, { rejectWithValue }) => {
    try {
      return await catalogApi.features()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().campers.features.status === 'idle' },
)

function upsertCampers(state: CamperState, campers: Camper[]) {
  campersAdapter.upsertMany(state.entities, campers)
  for (const camper of campers) state.slugToId[camper.slug] = camper._id
}

const camperSlice = createSlice({
  name: 'campers',
  initialState,
  reducers: {
    retryCatalog(state) {
      // Allows "Try again" buttons to re-run thunks guarded by `condition`.
      if (state.featured.status === 'failed') state.featured.status = 'idle'
      if (state.categories.status === 'failed') state.categories.status = 'idle'
      if (state.filterOptions.status === 'failed') state.filterOptions.status = 'idle'
      if (state.features.status === 'failed') state.features.status = 'idle'
      if (state.listing.status === 'failed') state.listing.key = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampers.pending, (state, action) => {
        state.listing.key = listingKey(action.meta.arg)
        state.listing.status = 'loading'
        state.listing.error = null
      })
      .addCase(fetchCampers.fulfilled, (state, action) => {
        if (state.listing.key !== listingKey(action.meta.arg)) return // a newer query is in flight
        upsertCampers(state, action.payload.items)
        state.listing.ids = action.payload.items.map((c) => c._id)
        state.listing.meta = action.payload.meta
        state.listing.status = 'succeeded'
      })
      .addCase(fetchCampers.rejected, (state, action) => {
        if (state.listing.key !== listingKey(action.meta.arg) || action.meta.aborted) return
        state.listing.status = 'failed'
        state.listing.error = action.payload ?? 'Campers could not be loaded.'
      })
      .addCase(fetchFeaturedCampers.pending, (state) => {
        state.featured.status = 'loading'
        state.featured.error = null
      })
      .addCase(fetchFeaturedCampers.fulfilled, (state, action) => {
        upsertCampers(state, action.payload)
        state.featured.data = action.payload.map((c) => c._id)
        state.featured.status = 'succeeded'
      })
      .addCase(fetchFeaturedCampers.rejected, (state, action) => {
        state.featured.status = 'failed'
        state.featured.error = action.payload ?? 'Campers could not be loaded.'
      })
      .addCase(fetchCamperDetail.pending, (state, action) => {
        state.details[action.meta.arg] = { status: 'loading', error: null, notFound: false }
      })
      .addCase(fetchCamperDetail.fulfilled, (state, action) => {
        upsertCampers(state, [action.payload])
        state.details[action.meta.arg] = { status: 'succeeded', error: null, notFound: false }
      })
      .addCase(fetchCamperDetail.rejected, (state, action) => {
        state.details[action.meta.arg] = {
          status: 'failed',
          error: action.payload?.message ?? 'The camper could not be loaded.',
          notFound: action.payload?.notFound ?? false,
        }
      })
      .addCase(fetchCompareCampers.pending, (state, action) => {
        state.compare.key = action.meta.arg.join(',')
        state.compare.status = 'loading'
        state.compare.error = null
      })
      .addCase(fetchCompareCampers.fulfilled, (state, action) => {
        if (state.compare.key !== action.meta.arg.join(',')) return
        upsertCampers(state, action.payload)
        state.compare.data = action.payload.map((c) => c._id)
        state.compare.status = 'succeeded'
      })
      .addCase(fetchCompareCampers.rejected, (state, action) => {
        if (state.compare.key !== action.meta.arg.join(',')) return
        state.compare.status = 'failed'
        state.compare.error = action.payload ?? 'Campers could not be loaded.'
      })
      .addCase(fetchCategoryPreview.pending, (state, action) => {
        state.categoryPreviews[action.meta.arg] = { data: [], status: 'loading', error: null }
      })
      .addCase(fetchCategoryPreview.fulfilled, (state, action) => {
        upsertCampers(state, action.payload)
        state.categoryPreviews[action.meta.arg] = { data: action.payload.map((c) => c._id), status: 'succeeded', error: null }
      })
      .addCase(fetchCategoryPreview.rejected, (state, action) => {
        state.categoryPreviews[action.meta.arg] = { data: [], status: 'failed', error: action.payload ?? 'Could not be loaded.' }
      })

    const reference = [
      [fetchFilterOptions, 'filterOptions'],
      [fetchCategories, 'categories'],
      [fetchFeatures, 'features'],
    ] as const
    for (const [thunk, key] of reference) {
      builder
        .addCase(thunk.pending, (state) => {
          state[key].status = 'loading'
          state[key].error = null
        })
        .addCase(thunk.rejected, (state, action) => {
          state[key].status = 'failed'
          state[key].error = action.payload ?? 'Could not be loaded.'
        })
    }
    builder
      .addCase(fetchFilterOptions.fulfilled, (state, action) => {
        state.filterOptions = { data: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = { data: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchFeatures.fulfilled, (state, action) => {
        state.features = { data: action.payload, status: 'succeeded', error: null }
      })
  },
})

export const { retryCatalog } = camperSlice.actions

export default camperSlice.reducer
