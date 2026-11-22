import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { createMemoryStorage } from '@/app/storage'
import { makeStore } from '@/app/store'
import type { Member } from '@/types/api'

export function createTestStore() {
  return makeStore(createMemoryStorage())
}

export function renderWithStore(ui: ReactElement, { route = '/', store = createTestStore() } = {}) {
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </Provider>,
    ),
  }
}

export const member: Member = {
  _id: '65f000000000000000000001',
  firstName: 'Jisoo',
  lastName: 'Kim',
  email: 'jisoo@example.com',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
