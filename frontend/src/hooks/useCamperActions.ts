import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppStore } from '@/app/hooks'
import { COMPARE_LIMIT } from '@/constants/camper'
import { ROUTES } from '@/constants/navigation'
import { addToCart } from '@/features/cart/cartSlice'
import { addToCompare, removeFromCompare } from '@/features/comparison/comparisonSlice'
import { toggleFavorite } from '@/features/favorites/favoritesSlice'
import { showToast } from '@/features/ui/uiSlice'
import type { RedirectState } from '@/routes/ProtectedRoute'
import type { ExtraSelection } from '@/services/bookingApi'
import type { CamperCardData } from '@/types/api'
import { coverImage } from '@/utils/camper'
import { addDaysISO, todayISO } from '@/utils/dates'

/**
 * Camper actions shared by cards, details and compare pages, with consistent feedback.
 * State is read lazily through the store so callers don't re-render on unrelated changes.
 */
export function useCamperActions() {
  const dispatch = useAppDispatch()
  const store = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  /** Favorites are stored on the server, so guests are sent to sign in first. */
  const toggleFavoriteCamper = useCallback(
    async (camper: Pick<CamperCardData, '_id' | 'name'>) => {
      if (store.getState().auth.status !== 'authenticated') {
        const state: RedirectState = { from: location.pathname + location.search }
        dispatch(showToast('Sign in to save campers to your favorites.', 'info'))
        navigate(ROUTES.signIn, { state })
        return
      }
      const add = !store.getState().favorites.ids.includes(camper._id)
      const result = await dispatch(toggleFavorite({ camperId: camper._id, add }))
      if (toggleFavorite.fulfilled.match(result)) {
        dispatch(showToast(result.payload.added ? `${camper.name} saved to favorites` : `${camper.name} removed from favorites`, 'info'))
      } else if (result.payload) {
        dispatch(showToast(result.payload, 'error'))
      }
    },
    [dispatch, store, navigate, location.pathname, location.search],
  )

  const toggleCompareCamper = useCallback(
    (camper: Pick<CamperCardData, '_id' | 'name'>) => {
      const ids = store.getState().comparison.ids
      if (ids.includes(camper._id)) {
        dispatch(removeFromCompare(camper._id))
        dispatch(showToast(`${camper.name} removed from comparison`, 'info'))
        return
      }
      if (ids.length >= COMPARE_LIMIT) {
        dispatch(showToast(`You can compare up to ${COMPARE_LIMIT} campers. Remove one first.`, 'error'))
        return
      }
      dispatch(addToCompare(camper._id))
      dispatch(showToast(`${camper.name} added to comparison`))
    },
    [dispatch, store],
  )

  /** Adds a trip to the planner; default dates start tomorrow for the camper's minimum stay. */
  const addCamperToCart = useCallback(
    (
      camper: Pick<CamperCardData, '_id' | 'slug' | 'name' | 'images' | 'pricing'> & { minNights?: number },
      options?: { startDate: string; endDate: string; extras?: ExtraSelection[] },
    ) => {
      const start = options?.startDate ?? addDaysISO(todayISO(), 1)
      dispatch(
        addToCart({
          camperId: camper._id,
          slug: camper.slug,
          name: camper.name,
          image: coverImage(camper) || null,
          dailyRate: camper.pricing.dailyRate,
          startDate: start,
          endDate: options?.endDate ?? addDaysISO(start, Math.max(camper.minNights ?? 1, 2)),
          extras: options?.extras ?? [],
        }),
      )
      dispatch(showToast(`${camper.name} added to your trips`))
    },
    [dispatch],
  )

  return { toggleFavoriteCamper, toggleCompareCamper, addCamperToCart }
}
