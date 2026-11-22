import type { Storage } from 'redux-persist'

/** Fired when the browser refuses a write (quota exceeded, storage disabled). */
export const STORAGE_ERROR_EVENT = 'fullcamper:storage-error'

/**
 * localStorage adapter for redux-persist that never throws.
 * Photos are stored as compressed data URLs, so a full quota is a realistic failure —
 * we surface it to the UI instead of silently losing data.
 */
export function createSafeStorage(backing: () => globalThis.Storage | undefined): Storage {
  return {
    getItem(key) {
      try {
        return Promise.resolve(backing()?.getItem(key) ?? null)
      } catch {
        return Promise.resolve(null)
      }
    },
    setItem(key, value: string) {
      try {
        backing()?.setItem(key, value)
      } catch (error) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(STORAGE_ERROR_EVENT, { detail: { key, error } }))
        }
      }
      return Promise.resolve()
    },
    removeItem(key) {
      try {
        backing()?.removeItem(key)
      } catch {
        /* ignore */
      }
      return Promise.resolve()
    },
  }
}

export const safeLocalStorage = createSafeStorage(() =>
  typeof window === 'undefined' ? undefined : window.localStorage,
)

/** In-memory storage — used by tests to exercise persistence without touching the browser. */
export function createMemoryStorage(): Storage & { dump(): Record<string, string> } {
  const data = new Map<string, string>()
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value: string) => {
      data.set(key, value)
      return Promise.resolve()
    },
    removeItem: (key) => {
      data.delete(key)
      return Promise.resolve()
    },
    dump: () => Object.fromEntries(data),
  }
}
