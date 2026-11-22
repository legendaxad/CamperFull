import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * List filters stored in the URL so they survive refresh, back/forward and
 * can be shared. Changing any filter resets to page 1.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string) => params.get(key) ?? '', [params])
  const getList = useCallback((key: string) => (params.get(key) ?? '').split(',').filter(Boolean), [params])
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  const set = useCallback(
    (updates: Record<string, string | string[] | null | undefined>, options: { keepPage?: boolean } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [key, value] of Object.entries(updates)) {
            const text = Array.isArray(value) ? value.join(',') : value
            if (text) next.set(key, text)
            else next.delete(key)
          }
          if (!options.keepPage) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setPage = useCallback((value: number) => set({ page: value > 1 ? String(value) : null }, { keepPage: true }), [set])
  const clear = useCallback((keys: string[]) => set(Object.fromEntries(keys.map((key) => [key, null]))), [set])

  return { params, get, getList, page, set, setPage, clear }
}
