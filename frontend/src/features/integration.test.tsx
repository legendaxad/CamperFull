import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/services/api/errors'
import { authApi } from '@/services/authApi'
import { favoriteApi } from '@/services/favoriteApi'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { createTestStore, member, renderWithStore } from '@/test/utils'
import { fetchCurrentUser, loginUser, logoutUser, registerUser, sessionExpired } from './auth/authSlice'
import { fetchFavoriteIds, toggleFavorite } from './favorites/favoritesSlice'
import { startNewListing, updateSection } from './publishing/publishingSlice'
import { publishListing } from './publishing/publishingThunks'

vi.mock('@/services/authApi', () => ({
  authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), register: vi.fn(), uploadAvatar: vi.fn() },
}))
vi.mock('@/services/favoriteApi', () => ({
  favoriteApi: { ids: vi.fn(), add: vi.fn(), remove: vi.fn(), list: vi.fn() },
}))

beforeEach(() => vi.clearAllMocks())

describe('auth', () => {
  it('restores the session from GET /auth/me and treats 401 as signed out', async () => {
    const store = createTestStore()
    vi.mocked(authApi.me).mockResolvedValueOnce(member)
    await store.dispatch(fetchCurrentUser())
    expect(store.getState().auth).toMatchObject({ status: 'authenticated', user: member })

    const anon = createTestStore()
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError('Please sign in to continue.', 401))
    await anon.dispatch(fetchCurrentUser())
    expect(anon.getState().auth).toMatchObject({ status: 'anonymous', user: null })
  })

  it('surfaces backend field errors on login/register', async () => {
    const store = createTestStore()
    vi.mocked(authApi.register).mockRejectedValueOnce(
      new ApiError('This email is already registered', 409, [{ field: 'email', message: 'This email is already registered' }]),
    )
    const result = await store.dispatch(registerUser({ firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'camper123' }))
    expect(registerUser.rejected.match(result)).toBe(true)
    expect(store.getState().auth.error).toBe('This email is already registered')
    expect(store.getState().auth.fieldErrors[0]?.field).toBe('email')
  })

  it('keeps the account when the optional avatar upload fails (e.g. uploads not configured)', async () => {
    const store = createTestStore()
    vi.mocked(authApi.register).mockResolvedValueOnce(member)
    vi.mocked(authApi.uploadAvatar).mockRejectedValueOnce(new ApiError('File uploads are not configured on this server', 503))
    const result = await store.dispatch(registerUser({ firstName: 'A', lastName: 'B', email: 'a@b.c', password: 'camper123', avatar: new File(['x'], 'a.png', { type: 'image/png' }) }))
    expect(registerUser.fulfilled.match(result) && result.payload.avatarError).toMatch(/not configured/)
    expect(store.getState().auth.status).toBe('authenticated')
  })

  it('clears user-scoped server state on logout and on session expiry', async () => {
    const store = createTestStore()
    store.dispatch(loginUser.fulfilled(member, 'r', { email: '', password: '' }))
    vi.mocked(favoriteApi.ids).mockResolvedValueOnce(['65f0000000000000000000aa'])
    await store.dispatch(fetchFavoriteIds())
    expect(store.getState().favorites.ids).toHaveLength(1)
    vi.mocked(authApi.logout).mockResolvedValueOnce()
    await store.dispatch(logoutUser())
    expect(store.getState().auth.user).toBeNull()
    expect(store.getState().favorites.ids).toEqual([])

    store.dispatch(loginUser.fulfilled(member, 'r', { email: '', password: '' }))
    store.dispatch(sessionExpired())
    expect(store.getState().auth.status).toBe('anonymous')
  })
})

describe('favorites', () => {
  it('toggles optimistically and rolls back when the request fails', async () => {
    const store = createTestStore()
    const id = '65f0000000000000000000aa'
    vi.mocked(favoriteApi.add).mockResolvedValueOnce()
    await store.dispatch(toggleFavorite({ camperId: id, add: true }))
    expect(store.getState().favorites.ids).toEqual([id])

    vi.mocked(favoriteApi.remove).mockRejectedValueOnce(new ApiError('Cannot reach the server.', null))
    const pending = store.dispatch(toggleFavorite({ camperId: id, add: false }))
    expect(store.getState().favorites.ids).toEqual([]) // optimistic
    await pending
    expect(store.getState().favorites.ids).toEqual([id]) // rolled back
    expect(store.getState().favorites.pending).toEqual([])
    expect(favoriteApi.add).toHaveBeenCalledTimes(1)
    expect(favoriteApi.remove).toHaveBeenCalledTimes(1)
  })
})

describe('local camper publishing', () => {
  it('saves a valid wizard session as a local listing owned by the signed-in member', async () => {
    const store = createTestStore()
    store.dispatch(loginUser.fulfilled(member, 'r', { email: '', password: '' }))
    store.dispatch(startNewListing(member._id))
    const rejected = await store.dispatch(publishListing())
    expect(publishListing.rejected.match(rejected) && rejected.payload?.stepIndex).toBe(0)

    store.dispatch(updateSection('basics', { title: 'Family camper', brand: 'Knaus', model: 'Sky', year: '2022', type: 'motorhome', category: 'motor', description: 'A spacious family motorhome with a full kitchen and comfy beds.', passengers: '4', sleepingPlaces: '4' }))
    store.dispatch(updateSection('specs', { lengthM: '7', widthM: '2.3', heightM: '2.9', weightKg: '3500', engineType: '2.3L', transmission: 'manual', fuelType: 'diesel', mileageKm: '1000', condition: 'used', registrationNumber: '12가 3456', registrationCountry: 'Korea' }))
    store.dispatch(updateSection('features', ['kitchen']))
    store.dispatch(updateSection('photos', [{ id: 'p1', src: 'data:image/jpeg;base64,AA', name: 'a.jpg', sizeBytes: 1, width: 1, height: 1, isCover: true }]))
    store.dispatch(updateSection('location', { country: 'Korea', city: 'Seoul', address: '10 Camper-ro', postalCode: '04001', coordinates: null }))
    const start = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const end = new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 10)
    store.dispatch(updateSection('pricing', { dailyPrice: '150000', weeklyDiscountPct: '', monthlyDiscountPct: '', securityDeposit: '', minRentalDays: '2', availableFrom: start, availableTo: end, additionalFees: [] }))
    const result = await store.dispatch(publishListing())
    expect(publishListing.rejected.match(result) ? result.payload : null).toBeNull()
    expect(store.getState().publishing.listings[0]).toMatchObject({ owner: { id: member._id, name: 'Jisoo Kim' }, basics: { title: 'Family camper', year: 2022 } })
    expect(store.getState().publishing.session).toBeNull()
  })
})

describe('protected routes', () => {
  const app = (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/bookings" element={<p>My bookings</p>} />
      </Route>
      <Route path="/sign-in" element={<p>Sign in page</p>} />
    </Routes>
  )

  it('waits for the session check, then renders for authenticated users', () => {
    const store = createTestStore()
    renderWithStore(app, { route: '/bookings', store })
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i)
  })

  it('redirects anonymous visitors to sign-in', () => {
    const store = createTestStore()
    store.dispatch(sessionExpired())
    renderWithStore(app, { route: '/bookings', store })
    expect(screen.getByText('Sign in page')).toBeInTheDocument()
  })

  it('shows the page once authenticated', () => {
    const store = createTestStore()
    store.dispatch(loginUser.fulfilled(member, 'r', { email: '', password: '' }))
    renderWithStore(app, { route: '/bookings', store })
    expect(screen.getByText('My bookings')).toBeInTheDocument()
  })
})
