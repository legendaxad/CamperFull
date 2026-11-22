import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryStorage } from '@/app/storage'
import { makeStore } from '@/app/store'
import { apiClient, setSessionExpiredHandler } from '@/services/api/apiClient'
import { routes } from '@/routes/router'

/*
 * jsdom's XHR does not keep the backend's HTTP-only cookies, so the harness uses axios'
 * Node adapter with a minimal cookie jar and sends the browser's Origin header. The app
 * code under test (thunks, interceptors, refresh logic, UI) is unchanged.
 */
const jar = new Map<string, string>()
apiClient.defaults.adapter = 'http'
apiClient.defaults.baseURL = 'http://localhost:3000/api/v1'
apiClient.interceptors.request.use((config) => {
  config.headers.set('Origin', 'http://localhost:3000')
  if (jar.size) config.headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '))
  return config
})
const storeCookies = (headers: unknown) => {
  const setCookie = (headers as Record<string, string[] | undefined>)['set-cookie'] ?? []
  for (const line of setCookie) {
    const [pair = ''] = line.split(';')
    const [name = '', value = ''] = pair.split('=')
    if (!value || /expires=Thu, 01 Jan 1970/i.test(line)) jar.delete(name)
    else jar.set(name, value)
  }
}
apiClient.interceptors.response.use(
  (response) => {
    storeCookies(response.headers)
    return response
  },
  (error: { response?: { headers: unknown } }) => {
    if (error.response) storeCookies(error.response.headers)
    return Promise.reject(error)
  },
)

function renderApp(path: string) {
  const store = makeStore(createMemoryStorage())
  setSessionExpiredHandler(() => {})
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  )
  return { store, router, user: userEvent.setup() }
}

const day = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

describe('FullCamper UI against the real API', () => {
  // Each test starts as a fresh, signed-out browser.
  beforeEach(() => jar.clear())

  it('home: navigation categories and featured campers come from the API', async () => {
    renderApp('/')
    const nav = await screen.findByRole('navigation', { name: 'Main' })
    await waitFor(() => expect(within(nav).getByRole('button', { name: /caravan/i })).toBeInTheDocument())
    expect(await screen.findByRole('link', { name: /Luxury Glide/i })).toBeInTheDocument()
  })

  it('listing: server-side filtering, sorting and empty state', async () => {
    const { router } = renderApp('/campers/caravan?sort=price_desc')
    await screen.findByRole('heading', { level: 1, name: 'Caravan' })
    const cards = await screen.findAllByRole('article')
    expect(cards.map((c) => within(c).getByRole('heading', { level: 3 }).textContent)).toEqual(['Luxury Glide', 'Eco Traveler'])
    expect(cards[0]).toHaveTextContent('₩450,000')

    await router.navigate('/campers?q=does-not-exist')
    expect(await screen.findByText(/no campers match/i)).toBeInTheDocument()
  })

  it('details: loads by slug, shows server quote, unknown slug is a 404', async () => {
    const { router } = renderApp('/camper/st-7')
    expect(await screen.findByRole('heading', { level: 2, name: 'ST-7' })).toBeInTheDocument()
    expect(await screen.findByText('Bedding kit')).toBeInTheDocument()
    // Quote from POST /bookings/quote (cleaning fee is part of the backend price).
    expect(await screen.findByText('Cleaning fee')).toBeInTheDocument()
    await router.navigate('/camper/no-such-camper')
    expect(await screen.findByText(/road doesn't lead anywhere/i)).toBeInTheDocument()
  })

  it('auth + booking: register, book with driver details, pay (mock provider), see it in My orders', async () => {
    const { store, router, user } = renderApp('/register')
    const email = `ui+${Date.now()}@example.com`
    await user.type(await screen.findByLabelText('First name'), 'Mina')
    await user.type(screen.getByLabelText('Last name'), 'Lee')
    await user.type(screen.getByLabelText('Email'), email)
    await user.type(screen.getByLabelText('Password'), 'camper123')
    await user.type(screen.getByLabelText('Repeat your password'), 'camper123')
    await user.click(screen.getByRole('button', { name: /registrate/i }))
    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'))
    expect(store.getState().auth.user?.firstName).toBe('Mina')

    const camperId = store.getState().campers.categoryPreviews.motorhome?.data[0]
      ?? (await (await fetch('http://localhost:3000/api/v1/campers?search=ST-7')).json()).data[0]._id
    // Random start so repeated runs never collide with an earlier booking (max advance is 365 days).
    const start = 30 + Math.floor(Math.random() * 300)
    await router.navigate(`/checkout/${camperId}?from=${day(start)}&to=${day(start + 3)}`)
    expect(await screen.findByRole('heading', { name: /complete your booking/i })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Mobile Phone Number'), '010-2222-3333')
    await user.type(screen.getByLabelText(/coupon code/i), 'WELCOME10')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(await screen.findByText(/Coupon WELCOME10 applied/)).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: /continue to payment/i })
    await waitFor(() => expect(submit).toBeEnabled())
    await user.click(submit)

    // Booking page: PENDING with hold, then pay.
    expect(await screen.findByText(/Complete your payment to confirm/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /pay now/i }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument())
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0)
    expect(screen.getByText(/payment status: paid/i)).toBeInTheDocument()

    await router.navigate('/bookings')
    const row = (await screen.findAllByRole('link', { name: /№ FC-/ })).find((link) => /ST-7/.test(link.textContent ?? ''))!
    expect(row).toHaveTextContent('Confirmed')
    expect(row).toHaveTextContent('Mina Lee')

    // Sign out clears the session server-side as well.
    await router.navigate('/profile')
    await user.click(await screen.findByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(store.getState().auth.status).toBe('anonymous'))
  })

  it('session persistence: a fresh app load restores the signed-in user from cookies', async () => {
    const email = `persist+${Date.now()}@example.com`
    const first = renderApp('/sign-in')
    await waitFor(() => expect(first.store.getState().auth.status).toBe('anonymous'))
    // Create the account through the API client (same cookie jar as the app).
    const { authApi } = await import('@/services/authApi')
    await authApi.register({ firstName: 'Persist', lastName: 'Test', email, password: 'camper123' })

    // New store = page refresh; cookies remain in the jsdom jar.
    const second = renderApp('/profile')
    await waitFor(() => expect(second.store.getState().auth.status).toBe('authenticated'))
    expect(await screen.findAllByDisplayValue('Persist')).not.toHaveLength(0)
  })

  it('sign-in shows the backend error for wrong credentials', async () => {
    const { user } = renderApp('/sign-in')
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpass1')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  })
})
