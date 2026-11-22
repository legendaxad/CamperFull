import { lazy } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth, RequireRole } from './RequireAuth'
import { RouteError } from './RouteError'

/* Route-level code splitting: charts and forms only load on the pages that use them. */
const DashboardPage = lazy(() => import('@/pages/Dashboard/DashboardPage'))
const AnalyticsPage = lazy(() => import('@/pages/Analytics/AnalyticsPage'))
const BookingsPage = lazy(() => import('@/pages/Bookings/BookingsPage'))
const BookingCalendarPage = lazy(() => import('@/pages/Bookings/BookingCalendarPage'))
const BookingDetailPage = lazy(() => import('@/pages/Bookings/BookingDetailPage'))
const CampersPage = lazy(() => import('@/pages/Campers/CampersPage'))
const CamperDetailPage = lazy(() => import('@/pages/Campers/CamperDetailPage'))
const CamperFormPage = lazy(() => import('@/pages/Campers/CamperFormPage'))
const CustomersPage = lazy(() => import('@/pages/Customers/CustomersPage'))
const CustomerDetailPage = lazy(() => import('@/pages/Customers/CustomerDetailPage'))
const PaymentsPage = lazy(() => import('@/pages/Payments/PaymentsPage'))
const PaymentDetailPage = lazy(() => import('@/pages/Payments/PaymentDetailPage'))
const ReportsPage = lazy(() => import('@/pages/Reports/ReportsPage'))
const NotificationsPage = lazy(() => import('@/pages/Notifications/NotificationsPage'))
const ActivityPage = lazy(() => import('@/pages/Activity/ActivityPage'))
const SettingsPage = lazy(() => import('@/pages/Settings/SettingsPage'))
const AdminsPage = lazy(() => import('@/pages/Admins/AdminsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      {
        // Errors thrown while rendering a page are caught here, so the shell stays usable.
        errorElement: <RouteError />,
        children: [
      { index: true, element: <DashboardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'bookings', element: <BookingsPage /> },
      { path: 'bookings/calendar', element: <BookingCalendarPage /> },
      { path: 'bookings/:id', element: <BookingDetailPage /> },
      { path: 'campers', element: <CampersPage /> },
      { path: 'campers/new', element: <CamperFormPage /> },
      { path: 'campers/:id', element: <CamperDetailPage /> },
      { path: 'campers/:id/edit', element: <CamperFormPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'payments/:id', element: <PaymentDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'settings', element: <SettingsPage /> },
      {
        path: 'admins',
        element: (
          <RequireRole roles={['SUPER_ADMIN']}>
            <AdminsPage />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
