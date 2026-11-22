import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@/app/store'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  tone: ToastTone
}

export interface UiState {
  mobileNavOpen: boolean
  filtersOpen: boolean
  activeVideoId: string | null
  toasts: Toast[]
}

const initialState: UiState = {
  mobileNavOpen: false,
  filtersOpen: false,
  activeVideoId: null,
  toasts: [],
}

const MAX_TOASTS = 3

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMobileNav(state, action: PayloadAction<boolean>) {
      state.mobileNavOpen = action.payload
    },
    setFiltersOpen(state, action: PayloadAction<boolean>) {
      state.filtersOpen = action.payload
    },
    openVideo(state, action: PayloadAction<string>) {
      state.activeVideoId = action.payload
    },
    closeVideo(state) {
      state.activeVideoId = null
    },
    showToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts = [...state.toasts, action.payload].slice(-MAX_TOASTS)
      },
      prepare(message: string, tone: ToastTone = 'success') {
        return { payload: { id: nanoid(), message, tone } }
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload)
    },
  },
})

export const { setMobileNav, setFiltersOpen, openVideo, closeVideo, showToast, dismissToast } =
  uiSlice.actions

export const selectMobileNavOpen = (state: RootState) => state.ui.mobileNavOpen
export const selectFiltersOpen = (state: RootState) => state.ui.filtersOpen
export const selectActiveVideoId = (state: RootState) => state.ui.activeVideoId
export const selectToasts = (state: RootState) => state.ui.toasts

export default uiSlice.reducer
