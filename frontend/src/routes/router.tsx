import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/common/PageLoader'
import { GuestOnlyRoute, ProtectedRoute } from './ProtectedRoute'

/* Route-level code splitting keeps the initial bundle small. */
function page(loader: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(loader)
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: page(() => import('@/pages/Home/HomePage')) },
      { path: 'campers', element: page(() => import('@/pages/Campers/CampersPage')) },
      { path: 'campers/:category', element: page(() => import('@/pages/Campers/CampersPage')) },
      { path: 'camper/:id', element: page(() => import('@/pages/CamperDetails/CamperDetailsPage')) },
      { path: 'compare', element: page(() => import('@/pages/Compare/ComparePage')) },
      { path: 'favorites', element: page(() => import('@/pages/Favorites/FavoritesPage')) },
      { path: 'cart', element: page(() => import('@/pages/Cart/CartPage')) },
      { path: 'camping-places', element: page(() => import('@/pages/CampingPlaces/CampingPlacesPage')) },
      // Reachable signed in or not: the link arrives by email.
      { path: 'reset-password', element: page(() => import('@/pages/Auth/PasswordPages').then((m) => ({ default: m.ResetPasswordPage }))) },
      {
        element: <GuestOnlyRoute />,
        children: [
          { path: 'sign-in', element: page(() => import('@/pages/Auth/SignInPage')) },
          { path: 'register', element: page(() => import('@/pages/Auth/RegisterPage')) },
          { path: 'forgot-password', element: page(() => import('@/pages/Auth/PasswordPages').then((m) => ({ default: m.ForgotPasswordPage }))) },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'publish', element: page(() => import('@/pages/Publishing/PublishPage')) },
          { path: 'publish/success/:id', element: page(() => import('@/pages/Publishing/PublishSuccessPage')) },
          { path: 'my-campers', element: page(() => import('@/pages/MyCampers/MyCampersPage')) },
          { path: 'checkout/:camperId', element: page(() => import('@/pages/Checkout/CheckoutPage')) },
          { path: 'bookings', element: page(() => import('@/pages/Bookings/BookingsPage')) },
          { path: 'bookings/:id', element: page(() => import('@/pages/Bookings/BookingDetailPage')) },
          { path: 'profile', element: page(() => import('@/pages/Profile/ProfilePage')) },
        ],
      },
      { path: '*', element: page(() => import('@/pages/NotFound/NotFoundPage')) },
    ],
  },
]

export const router = createBrowserRouter(routes)
