import { useCallback, useEffect, useState } from 'react'
import { describeError } from '@/services/api/errors'
import { camperApi } from '@/services/camperApi'
import type { PaginationMeta, RatingSummary, Review } from '@/types/api'

export type ReviewSort = 'newest' | 'highest' | 'lowest'

interface ReviewsState {
  status: 'loading' | 'succeeded' | 'failed'
  items: Review[]
  meta: PaginationMeta | null
  summary: RatingSummary | null
  error: string | null
}

const PAGE_SIZE = 5

/**
 * Published reviews of one camper (GET /campers/:idOrSlug/reviews) with "load more".
 * Reviews are only shown on this tab, so they are kept in the hook instead of Redux.
 */
export function useCamperReviews(camperId: string, sort: ReviewSort) {
  const [state, setState] = useState<ReviewsState>({ status: 'loading', items: [], meta: null, summary: null, error: null })

  const load = useCallback(
    async (page: number) => {
      setState((s) => ({ ...s, status: 'loading', error: null, ...(page === 1 ? { items: [] } : {}) }))
      try {
        const response = await camperApi.reviews(camperId, { page, limit: PAGE_SIZE, sort })
        setState((s) => ({
          status: 'succeeded',
          items: page === 1 ? response.data : [...s.items, ...response.data],
          meta: response.meta ?? null,
          summary: response.summary,
          error: null,
        }))
      } catch (error) {
        setState((s) => ({ ...s, status: 'failed', error: describeError(error) }))
      }
    },
    [camperId, sort],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  const loadMore = useCallback(() => {
    if (state.meta?.hasNextPage) void load(state.meta.page + 1)
  }, [load, state.meta])

  return { ...state, loadMore, retry: () => void load(1) }
}
