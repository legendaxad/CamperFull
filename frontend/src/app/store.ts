import { configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
  type Storage,
} from 'redux-persist'
import { sessionExpired } from '@/features/auth/authSlice'
import { showToast } from '@/features/ui/uiSlice'
import { setSessionExpiredHandler } from '@/services/api/apiClient'
import { createRootReducer, OBSOLETE_PERSIST_KEYS } from './rootReducer'
import { safeLocalStorage } from './storage'

/**
 * Store factory. The app uses the localStorage-backed singleton below; tests create
 * isolated stores with in-memory storage.
 */
export function makeStore(storage: Storage = safeLocalStorage) {
  return configureStore({
    reducer: createRootReducer(storage),
    middleware: (getDefault) =>
      getDefault({
        serializableCheck: {
          // redux-persist dispatches non-serializable callbacks in these actions.
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
    devTools: import.meta.env.DEV,
  })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']

/** Removes data persisted by the pre-backend build (mock accounts, mock bookings, ...). */
function removeObsoleteStorage() {
  try {
    for (const key of OBSOLETE_PERSIST_KEYS) window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

removeObsoleteStorage()

export const store = makeStore()
export const persistor = persistStore(store)

// When the refresh token is rejected the API client calls this; only signed-in users are told.
setSessionExpiredHandler(() => {
  if (store.getState().auth.status !== 'authenticated') return
  store.dispatch(sessionExpired())
  store.dispatch(showToast('Your session has expired. Please sign in again.', 'info'))
})
