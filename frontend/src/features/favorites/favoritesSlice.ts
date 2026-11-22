import { createSlice } from '@reduxjs/toolkit'
import { createAppAsyncThunk } from '@/app/createAppAsyncThunk'
import type { RootState } from '@/app/store'
import { logoutUser, sessionExpired } from '@/features/auth/authSlice'
import { describeError } from '@/services/api/errors'
import { favoriteApi } from '@/services/favoriteApi'
import type { FavoriteCamper, PaginationMeta } from '@/types/api'
import type { RequestStatus } from '@/features/campers/camperSlice'

/*
 * Favorites live on the server (one list per member). The heart icons need only the
 * id list (GET /favorites/ids); the Favorites page loads full cards (GET /favorites).
 * Toggles are optimistic and rolled back if the request fails.
 */
export interface FavoritesState {
  ids: string[]
  idsStatus: RequestStatus
  /** Camper ids with a request in flight — prevents double submissions. */
  pending: string[]
  page: { items: FavoriteCamper[]; meta: PaginationMeta | null; status: RequestStatus; error: string | null }
}

const initialState: FavoritesState = {
  ids: [],
  idsStatus: 'idle',
  pending: [],
  page: { items: [], meta: null, status: 'idle', error: null },
}

export const fetchFavoriteIds = createAppAsyncThunk(
  'favorites/fetchIds',
  async (_: void, { rejectWithValue }) => {
    try {
      return await favoriteApi.ids()
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: (_, { getState }) => getState().favorites.idsStatus !== 'loading' },
)

export const fetchFavoritesPage = createAppAsyncThunk(
  'favorites/fetchPage',
  async (page: number, { rejectWithValue }) => {
    try {
      return await favoriteApi.list(page)
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
)

/**
 * Adds or removes a favorite. The intent (`add`) is decided by the caller from the
 * current state *before* dispatching — the optimistic `pending` update flips the id
 * list, so the payload creator must not re-derive it.
 */
export const toggleFavorite = createAppAsyncThunk<
  { camperId: string; added: boolean },
  { camperId: string; add: boolean },
  { rejectValue: string }
>(
  'favorites/toggle',
  async ({ camperId, add }, { rejectWithValue }) => {
    try {
      if (add) await favoriteApi.add(camperId)
      else await favoriteApi.remove(camperId)
      return { camperId, added: add }
    } catch (error) {
      return rejectWithValue(describeError(error))
    }
  },
  { condition: ({ camperId }, { getState }) => !getState().favorites.pending.includes(camperId) },
)

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavoriteIds.pending, (state) => {
        state.idsStatus = 'loading'
      })
      .addCase(fetchFavoriteIds.fulfilled, (state, action) => {
        state.ids = action.payload
        state.idsStatus = 'succeeded'
      })
      .addCase(fetchFavoriteIds.rejected, (state) => {
        state.idsStatus = 'failed'
      })
      .addCase(fetchFavoritesPage.pending, (state) => {
        state.page.status = 'loading'
        state.page.error = null
      })
      .addCase(fetchFavoritesPage.fulfilled, (state, action) => {
        state.page = { items: action.payload.items, meta: action.payload.meta, status: 'succeeded', error: null }
      })
      .addCase(fetchFavoritesPage.rejected, (state, action) => {
        state.page.status = 'failed'
        state.page.error = action.payload ?? 'Favorites could not be loaded.'
      })
      .addCase(toggleFavorite.pending, (state, action) => {
        const { camperId, add } = action.meta.arg
        state.pending.push(camperId)
        // Optimistic update.
        state.ids = add ? [camperId, ...state.ids.filter((x) => x !== camperId)] : state.ids.filter((x) => x !== camperId)
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { camperId } = action.meta.arg
        state.pending = state.pending.filter((x) => x !== camperId)
        if (!action.payload.added) state.page.items = state.page.items.filter((c) => c._id !== camperId)
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        if (action.meta.condition) return // skipped as a duplicate: nothing was changed
        const { camperId, add } = action.meta.arg
        state.pending = state.pending.filter((x) => x !== camperId)
        // Roll back the optimistic change.
        state.ids = add ? state.ids.filter((x) => x !== camperId) : [camperId, ...state.ids.filter((x) => x !== camperId)]
      })
      .addCase(logoutUser.fulfilled, () => initialState)
      .addCase(sessionExpired, () => initialState)
  },
})

export const selectFavoriteIds = (state: RootState) => state.favorites.ids
export const selectIsFavorite = (state: RootState, id: string) => state.favorites.ids.includes(id)
export const selectFavoritesPage = (state: RootState) => state.favorites.page

export default favoritesSlice.reducer
