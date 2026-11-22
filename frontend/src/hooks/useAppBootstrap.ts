import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { STORAGE_ERROR_EVENT } from '@/app/storage'
import { fetchCurrentUser, selectAuthStatus } from '@/features/auth/authSlice'
import { fetchCategories } from '@/features/campers/camperSlice'
import { fetchSettings } from '@/features/content/contentSlice'
import { fetchFavoriteIds } from '@/features/favorites/favoritesSlice'
import { showToast } from '@/features/ui/uiSlice'

/**
 * App start-up:
 * - restores the session from the auth cookies (GET /auth/me);
 * - loads data every page needs (categories for the navigation, business settings);
 * - loads favorite ids once the customer is known;
 * - reports storage-quota failures (wizard photos are stored locally).
 */
export function useAppBootstrap(): void {
  const dispatch = useAppDispatch()
  const authStatus = useAppSelector(selectAuthStatus)

  useEffect(() => {
    void dispatch(fetchCurrentUser())
    void dispatch(fetchCategories())
    void dispatch(fetchSettings())
  }, [dispatch])

  useEffect(() => {
    if (authStatus === 'authenticated') void dispatch(fetchFavoriteIds())
  }, [authStatus, dispatch])

  useEffect(() => {
    const onStorageError = () =>
      dispatch(
        showToast('Browser storage is full — your latest changes may not be saved. Try removing some photos or drafts.', 'error'),
      )
    window.addEventListener(STORAGE_ERROR_EVENT, onStorageError)
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onStorageError)
  }, [dispatch])
}
