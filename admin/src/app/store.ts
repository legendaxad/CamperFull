import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from '@/services/api'

export function makeStore() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
    devTools: import.meta.env.DEV,
  })
}

export const store = makeStore()
// Enables refetchOnFocus / refetchOnReconnect behaviour.
setupListeners(store.dispatch)

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
