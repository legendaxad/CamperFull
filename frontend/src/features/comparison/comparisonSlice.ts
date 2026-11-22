import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'
import { COMPARE_LIMIT } from '@/constants/camper'

/** Camper ids picked for comparison (kept in this browser; the data comes from GET /campers/compare). */
export interface ComparisonState {
  ids: string[]
}

const initialState: ComparisonState = { ids: [] }

const comparisonSlice = createSlice({
  name: 'comparison',
  initialState,
  reducers: {
    /** Ignored when the comparison is already full (the UI warns first). */
    addToCompare(state, action: PayloadAction<string>) {
      if (state.ids.includes(action.payload) || state.ids.length >= COMPARE_LIMIT) return
      state.ids.push(action.payload)
    },
    removeFromCompare(state, action: PayloadAction<string>) {
      state.ids = state.ids.filter((id) => id !== action.payload)
    },
    /** Drops ids the backend no longer returns (archived/deleted campers). */
    pruneCompare(state, action: PayloadAction<string[]>) {
      state.ids = state.ids.filter((id) => action.payload.includes(id))
    },
    clearCompare(state) {
      state.ids = []
    },
  },
})

export const { addToCompare, removeFromCompare, pruneCompare, clearCompare } = comparisonSlice.actions

export const selectCompareIds = (state: RootState) => state.comparison.ids
export const selectIsCompared = (state: RootState, id: string) => state.comparison.ids.includes(id)

export default comparisonSlice.reducer
