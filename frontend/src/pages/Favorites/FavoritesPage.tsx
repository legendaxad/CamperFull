import { Heart, LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { CamperCard, CamperGridSkeleton } from '@/components/camper/CamperCard'
import { ButtonLink } from '@/components/common/Button'
import { EmptyState, ErrorState } from '@/components/common/Feedback'
import { Pagination } from '@/components/common/Pagination'
import { ROUTES } from '@/constants/navigation'
import { selectAuthStatus } from '@/features/auth/authSlice'
import { fetchFavoritesPage, selectFavoriteIds, selectFavoritesPage } from '@/features/favorites/favoritesSlice'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { pluralize } from '@/utils/format'

/** Favorites are stored per account on the server (GET /favorites). */
export default function FavoritesPage() {
  useDocumentTitle('Favorites')
  const dispatch = useAppDispatch()
  const authStatus = useAppSelector(selectAuthStatus)
  const favorites = useAppSelector(selectFavoritesPage)
  const favoriteIds = useAppSelector(selectFavoriteIds)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (authStatus === 'authenticated') void dispatch(fetchFavoritesPage(page))
  }, [dispatch, authStatus, page])

  // Hearts toggled elsewhere are reflected immediately; removed campers disappear from the grid.
  const items = favorites.items.filter((camper) => favoriteIds.includes(camper._id))

  let content
  if (authStatus === 'anonymous') {
    content = (
      <EmptyState
        icon={LogIn}
        title="Sign in to see your favorites"
        description="Favorites are saved to your account so they follow you on every device."
        action={<ButtonLink to={ROUTES.signIn} state={{ from: ROUTES.favorites }}>Sign in</ButtonLink>}
      />
    )
  } else if (favorites.status === 'failed') {
    content = <ErrorState message={favorites.error ?? 'Favorites could not be loaded.'} onRetry={() => void dispatch(fetchFavoritesPage(page))} />
  } else if (authStatus === 'unknown' || favorites.status !== 'succeeded') {
    content = <CamperGridSkeleton count={4} />
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon={Heart}
        title="No favorites yet"
        description="Tap the heart on any camper to save it here for later."
        action={<ButtonLink to={ROUTES.campers}>Discover campers</ButtonLink>}
      />
    )
  } else {
    content = (
      <>
        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((camper) => <CamperCard key={camper._id} camper={camper} />)}
        </div>
        <div className="mt-10">
          <Pagination page={favorites.meta?.page ?? 1} total={favorites.meta?.totalPages ?? 1} onChange={setPage} />
        </div>
      </>
    )
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="section-title">Favorites</h1>
      {authStatus === 'authenticated' && favorites.meta && (
        <p className="mt-4 text-sm text-muted">{pluralize(favorites.meta.total, 'saved camper')}</p>
      )}
      <div className="mt-8">{content}</div>
    </div>
  )
}
