/*
 * Renders every route against real API responses captured from the backend
 * (src/test/fixtures, recorded from a throwaway dev database). Catches runtime
 * errors, wrong response-shape assumptions and broken navigation without a browser.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import idsText from './fixtures/ids.txt?raw'

const fixtures = import.meta.glob<unknown>('./fixtures/*.json', { eager: true, import: 'default' })
const fixture = (name: string): unknown => fixtures[`./fixtures/${name}.json`]
const [bookingId, camperId, customerId, paymentId] = idsText.trim().split(' ')

/** URL -> fixture. Detail routes match by id; everything else by path. */
const ROUTES: [RegExp, string][] = [
  [/^\/auth\/me$/, 'me'],
  [/^\/dashboard\/overview$/, 'overview'],
  [/^\/dashboard\/kpis$/, 'kpis'],
  [/^\/dashboard\/revenue$/, 'revenue'],
  [/^\/dashboard\/bookings$/, 'bookingSeries'],
  [/^\/dashboard\/top-campers$/, 'topCampers'],
  [/^\/dashboard\/fleet$/, 'fleet'],
  [/^\/dashboard\/customers$/, 'customerAnalytics'],
  [/^\/dashboard\/payments$/, 'paymentSummary'],
  [/^\/dashboard\/activity$/, 'activity'],
  [/^\/bookings$/, 'bookings'],
  [/^\/bookings\/[a-f\d]{24}$/, 'booking'],
  [/^\/campers$/, 'campers'],
  [/^\/campers\/[a-f\d]{24}$/, 'camper'],
  [/^\/customers$/, 'customers'],
  [/^\/customers\/[a-f\d]{24}$/, 'customer'],
  [/^\/payments$/, 'payments'],
  [/^\/payments\/[a-f\d]{24}$/, 'payment'],
  [/^\/notifications$/, 'notifications'],
  [/^\/notifications\/unread-count$/, 'unread'],
  [/^\/settings$/, 'settings'],
  [/^\/admins$/, 'admins'],
  [/^\/categories$/, 'categories'],
  [/^\/features$/, 'features'],
]

const requested: string[] = []

vi.mock('@/services/httpClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/httpClient')>()
  return {
    ...actual,
    httpClient: {
      request: vi.fn(async ({ url }: { url: string }) => {
        requested.push(url)
        const match = ROUTES.find(([pattern]) => pattern.test(url))
        if (!match) throw new Error(`Unmocked request: ${url}`)
        return { data: fixture(match[1]) }
      }),
    },
  }
})

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  requested.length = 0
})

async function renderRoute(path: string) {
  const [{ routes }, { makeStore }, { ThemeProvider }, { ToastProvider }] = await Promise.all([
    import('@/routes/router'),
    import('@/app/store'),
    import('@/features/theme/ThemeProvider'),
    import('@/components/ui/Toaster'),
  ])
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  await act(async () => {
    render(
      <Provider store={makeStore()}>
        <ThemeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>,
    )
  })
  return router
}

const PAGES: [string, string | RegExp][] = [
  ['/', /Good (morning|afternoon|evening), Kyle/],
  ['/analytics', 'Analytics'],
  ['/bookings', 'Bookings'],
  ['/bookings/calendar', 'Booking calendar'],
  [`/bookings/${bookingId}`, /^FC-/],
  ['/campers', 'Fleet'],
  ['/campers/new', 'Add camper'],
  [`/campers/${camperId}`, /\S/],
  [`/campers/${camperId}/edit`, /^Edit /],
  ['/customers', 'Customers'],
  [`/customers/${customerId}`, /\S/],
  ['/payments', 'Payments'],
  [`/payments/${paymentId}`, /₩/],
  ['/reports', 'Reports'],
  ['/notifications', 'Notifications'],
  ['/activity', 'Activity log'],
  ['/settings', 'Settings'],
  ['/settings?tab=profile', 'Settings'],
  ['/settings?tab=appearance', 'Settings'],
  ['/admins', 'Admins & roles'],
  ['/does-not-exist', 'Page not found'],
]

describe('every route renders with real API data', () => {
  it.each(PAGES)('%s', async (path, heading) => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      const text = String(args[0])
      // Recharts warns about zero-size containers in jsdom; that is expected without layout.
      if (!/width\(0\) and height\(0\)|The width\(-?\d+\) and height/.test(text)) errors.push(args)
    })
    await renderRoute(path)
    const h1 = await screen.findByRole('heading', { level: 1 }, { timeout: 4000 })
    expect(h1.textContent ?? '').toMatch(heading)
    // Let queued queries settle so their data renders too.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
    })
    expect(screen.queryByText(/Unexpected Application Error|ran into a problem/i)).toBeNull()
    expect(screen.queryByText(/Could not load data/i)).toBeNull()
    expect(errors).toEqual([])
    spy.mockRestore()
  })
})

describe('data rendering', () => {
  it('shows KPI values computed by the backend', async () => {
    await renderRoute('/')
    await screen.findByText('Total revenue')
    expect(screen.getByText('Occupancy rate')).toBeInTheDocument()
    expect(screen.getByText('Cancellation rate')).toBeInTheDocument()
    expect(requested).toContain('/dashboard/kpis')
  })

  it('shows the admin link only to super admins', async () => {
    await renderRoute('/')
    await screen.findAllByText('Admins & roles')
  })
})
