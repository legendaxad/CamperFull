import { combineReducers } from '@reduxjs/toolkit'
import { createMigrate, persistReducer, type MigrationManifest, type PersistedState, type Storage } from 'redux-persist'
import authReducer from '@/features/auth/authSlice'
import bookingReducer from '@/features/bookings/bookingSlice'
import camperReducer from '@/features/campers/camperSlice'
import cartReducer from '@/features/cart/cartSlice'
import comparisonReducer from '@/features/comparison/comparisonSlice'
import contentReducer from '@/features/content/contentSlice'
import favoritesReducer from '@/features/favorites/favoritesSlice'
import publishingReducer from '@/features/publishing/publishingSlice'
import uiReducer from '@/features/ui/uiSlice'

/*
 * State ownership
 * ┌─────────────┬──────────────┬─────────────────────────────────────────────────────────┐
 * │ slice       │ source       │ persisted                                               │
 * ├─────────────┼──────────────┼─────────────────────────────────────────────────────────┤
 * │ auth        │ backend      │ no — HTTP-only cookies; restored via GET /auth/me        │
 * │ campers     │ backend      │ no — catalog is always fetched fresh                     │
 * │ bookings    │ backend      │ no                                                      │
 * │ favorites   │ backend      │ no                                                      │
 * │ content     │ backend      │ no — settings, camping places                           │
 * │ comparison  │ this browser │ yes — selected camper ids                               │
 * │ cart        │ this browser │ yes — trip planner items (quotes are refetched)         │
 * │ publishing  │ this browser │ yes — wizard session, drafts and local listings         │
 * │ ui          │ this browser │ no                                                      │
 * └─────────────┴──────────────┴─────────────────────────────────────────────────────────┘
 */

export const PERSIST_KEY_PREFIX = 'fullcamper'
export const PERSIST_VERSION = 2

/** Keys written by the pre-backend version of the app; removed once on startup. */
export const OBSOLETE_PERSIST_KEYS = ['auth', 'campers', 'favorites', 'bookings'].map((k) => `persist:${PERSIST_KEY_PREFIX}:${k}`)

type Persisted<T> = (T & PersistedState) | undefined

/** v2: cart items gained a camper snapshot (slug/name/rate); older items cannot be shown and are dropped. */
const cartMigrations: MigrationManifest = {
  2: (state) => {
    const cart = state as Persisted<{ items?: { slug?: unknown }[] }>
    if (!cart) return cart
    return { ...cart, items: (cart.items ?? []).filter((item) => typeof item.slug === 'string') } as PersistedState
  },
}

/** v2: comparison ids must be backend ObjectIds now (mock slugs are discarded). */
const comparisonMigrations: MigrationManifest = {
  2: (state) => {
    const comparison = state as Persisted<{ ids?: string[] }>
    if (!comparison) return comparison
    return { ...comparison, ids: (comparison.ids ?? []).filter((id) => /^[a-f\d]{24}$/i.test(id)) } as PersistedState
  },
}

const noop: MigrationManifest = { 2: (state) => state }

export function createRootReducer(storage: Storage) {
  const persisted = <S>(key: string, whitelist: (keyof S & string)[], migrations: MigrationManifest = noop) => ({
    key: `${PERSIST_KEY_PREFIX}:${key}`,
    version: PERSIST_VERSION,
    storage,
    whitelist,
    migrate: createMigrate(migrations, { debug: false }),
    throttle: 400,
  })

  return combineReducers({
    auth: authReducer,
    campers: camperReducer,
    bookings: bookingReducer,
    favorites: favoritesReducer,
    content: contentReducer,
    comparison: persistReducer(persisted<ReturnType<typeof comparisonReducer>>('comparison', ['ids'], comparisonMigrations), comparisonReducer),
    cart: persistReducer(persisted<ReturnType<typeof cartReducer>>('cart', ['items'], cartMigrations), cartReducer),
    publishing: persistReducer(
      persisted<ReturnType<typeof publishingReducer>>('publishing', ['session', 'drafts', 'listings']),
      publishingReducer,
    ),
    ui: uiReducer,
  })
}
