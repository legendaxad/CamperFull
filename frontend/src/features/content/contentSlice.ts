import { createSlice } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { RootState } from '@/app/store'
import type { RequestStatus } from '@/features/campers/camperSlice'
import { describeError } from '@/services/api/errors'
import { catalogApi } from '@/services/camperApi'
import type { CampingPlace, PaginationMeta, PublicSettings } from '@/types/api'

/** Public business settings (contact details, cancellation policy) and camping places. */
export interface ContentState {
  settings: { data: PublicSettings | null; status: RequestStatus }
  campingPlaces: { page: number; items: CampingPlace[]; meta: PaginationMeta | null; status: RequestStatus; error: string | null }
}

const initialState: ContentState = {
  settings: { data: null, status: 'idle' },
  campingPlaces: { page: 0, items: [], meta: null, status: 'idle', error: null },
}

export const fetchSettings = createAppAsyncThunk(
  'content/fetchSettings',
  async (_: void, { rejectWithValue }) => {
    try {
      return await catalogApi.settings()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().content.settings.status === 'idle' },
)

export const fetchCampingPlaces = createAppAsyncThunk(
  'content/fetchCampingPlaces',
  async (page: number, { rejectWithValue }) => {
    try {
      return await catalogApi.campingPlaces({ page, limit: 12 })
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  {
    condition: (page, { getState }) => {
      const { campingPlaces } = getState().content
      return !(campingPlaces.page === page && (campingPlaces.status === 'loading' || campingPlaces.status === 'succeeded'))
    },
  },
)

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.settings.status = 'loading'
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settings = { data: action.payload, status: 'succeeded' }
      })
      .addCase(fetchSettings.rejected, (state) => {
        state.settings.status = 'failed'
      })
      .addCase(fetchCampingPlaces.pending, (state, action) => {
        state.campingPlaces.page = action.meta.arg
        state.campingPlaces.status = 'loading'
        state.campingPlaces.error = null
      })
      .addCase(fetchCampingPlaces.fulfilled, (state, action) => {
        state.campingPlaces = { page: action.meta.arg, items: action.payload.items, meta: action.payload.meta, status: 'succeeded', error: null }
      })
      .addCase(fetchCampingPlaces.rejected, (state, action) => {
        state.campingPlaces.status = 'failed'
        state.campingPlaces.error = action.payload ?? 'Camping places could not be loaded.'
      })
  },
})

export const selectSettings = (state: RootState) => state.content.settings.data
export const selectCampingPlaces = (state: RootState) => state.content.campingPlaces

export default contentSlice.reducer
