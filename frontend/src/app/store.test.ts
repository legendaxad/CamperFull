import { persistStore } from 'redux-persist'
import { describe, expect, it } from 'vitest'
import { loginUser } from '@/features/auth/authSlice'
import { addToCart } from '@/features/cart/cartSlice'
import { addToCompare } from '@/features/comparison/comparisonSlice'
import { member } from '@/test/utils'
import { createMemoryStorage } from './storage'
import { makeStore } from './store'

type Persistor = ReturnType<typeof persistStore>
const bootstrapped = (persistor: Persistor) =>
  new Promise<void>((resolve) => {
    if (persistor.getState().bootstrapped) return resolve()
    const unsubscribe = persistor.subscribe(() => {
      if (persistor.getState().bootstrapped) {
        unsubscribe()
        resolve()
      }
    })
  })

describe('store & persistence', () => {
  it('initializes every slice with safe defaults', () => {
    const state = makeStore(createMemoryStorage()).getState()
    expect(state.auth.status).toBe('unknown')
    expect(state.campers.listing.status).toBe('idle')
    expect(state.cart.items).toEqual([])
    expect(state.publishing.listings).toEqual([])
  })

  it('persists only client-owned state — never auth or server data', async () => {
    const storage = createMemoryStorage()
    const store = makeStore(storage)
    const persistor = persistStore(store)
    await bootstrapped(persistor)
    store.dispatch(loginUser.fulfilled(member, 'req', { email: member.email, password: 'x' }))
    store.dispatch(addToCompare('65f0000000000000000000aa'))
    store.dispatch(addToCart({ camperId: '65f0000000000000000000aa', slug: 'a', name: 'A', image: null, dailyRate: 1, startDate: '2027-01-01', endDate: '2027-01-03', extras: [] }))
    await persistor.flush()
    const keys = Object.keys(storage.dump()).sort()
    expect(keys).toEqual(['persist:fullcamper:cart', 'persist:fullcamper:comparison', 'persist:fullcamper:publishing'])
    expect(JSON.stringify(storage.dump())).not.toContain(member.email)

    // Rehydrate into a new store.
    const restored = makeStore(storage)
    await bootstrapped(persistStore(restored))
    expect(restored.getState().comparison.ids).toEqual(['65f0000000000000000000aa'])
    expect(restored.getState().cart.items).toHaveLength(1)
    expect(restored.getState().auth.user).toBeNull()
  })

  it('migrates v1 data: drops mock cart items and non-ObjectId compare ids', async () => {
    const storage = createMemoryStorage()
    await storage.setItem('persist:fullcamper:cart', JSON.stringify({ items: JSON.stringify([{ camperId: 'knaus-sky', startDate: 'x' }]), _persist: JSON.stringify({ version: 1, rehydrated: true }) }))
    await storage.setItem('persist:fullcamper:comparison', JSON.stringify({ ids: JSON.stringify(['knaus-sky', '65f0000000000000000000bb']), _persist: JSON.stringify({ version: 1, rehydrated: true }) }))
    const store = makeStore(storage)
    await bootstrapped(persistStore(store))
    expect(store.getState().cart.items).toEqual([])
    expect(store.getState().comparison.ids).toEqual(['65f0000000000000000000bb'])
  })
})
