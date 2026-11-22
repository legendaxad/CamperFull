import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, getPaginated, setSessionExpiredHandler, toQueryParams } from './apiClient'
import { ApiError, describeError, toApiError } from './errors'

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> {
  const response = { data, status, statusText: String(status), headers: {}, config } as AxiosResponse
  if (status >= 400) return Promise.reject(new AxiosError('fail', String(status), config, null, response))
  return Promise.resolve(response)
}

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  setSessionExpiredHandler(() => {})
})

describe('apiClient', () => {
  it('sends credentials (cookie auth) and unwraps the paginated envelope', async () => {
    let withCredentials: boolean | undefined
    apiClient.defaults.adapter = ((config) => {
      withCredentials = config.withCredentials
      return respond(config, 200, { success: true, message: 'ok', data: [{ id: 1 }], meta: { page: 1, limit: 12, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false } })
    }) as AxiosAdapter
    const result = await getPaginated<{ id: number }>('/campers')
    expect(withCredentials).toBe(true)
    expect(result.items).toEqual([{ id: 1 }])
    expect(result.meta.total).toBe(1)
  })

  it('refreshes once on 401 and replays the request', async () => {
    const calls: string[] = []
    let refreshed = false
    apiClient.defaults.adapter = ((config) => {
      calls.push(`${config.method} ${config.url}`)
      if (config.url === '/auth/refresh') {
        refreshed = true
        return respond(config, 200, { success: true, message: 'Session refreshed', data: null })
      }
      return refreshed ? respond(config, 200, { success: true, message: 'ok', data: 'secret' }) : respond(config, 401, { success: false, message: 'Invalid or expired token', errors: [] })
    }) as AxiosAdapter
    const response = await apiClient.get('/bookings')
    expect(response.data.data).toBe('secret')
    expect(calls).toEqual(['get /bookings', 'post /auth/refresh', 'get /bookings'])
  })

  it('shares one refresh between concurrent 401s and reports an expired session', async () => {
    const expired = vi.fn()
    setSessionExpiredHandler(expired)
    let refreshCalls = 0
    apiClient.defaults.adapter = ((config) => {
      if (config.url === '/auth/refresh') {
        refreshCalls += 1
        return respond(config, 401, { success: false, message: 'Invalid or expired token', errors: [] })
      }
      return respond(config, 401, { success: false, message: 'You are not authenticated. Please log in.', errors: [] })
    }) as AxiosAdapter
    const results = await Promise.allSettled([apiClient.get('/bookings'), apiClient.get('/favorites/ids')])
    expect(refreshCalls).toBe(1)
    expect(expired).toHaveBeenCalledTimes(2)
    for (const r of results) {
      expect(r.status).toBe('rejected')
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(ApiError)
      expect(((r as PromiseRejectedResult).reason as ApiError).status).toBe(401)
    }
  })

  it('never tries to refresh for a failed login', async () => {
    const urls: string[] = []
    apiClient.defaults.adapter = ((config) => {
      urls.push(config.url ?? '')
      return respond(config, 401, { success: false, message: 'Invalid email or password', errors: [] })
    }) as AxiosAdapter
    await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({ message: 'Invalid email or password', status: 401 })
    expect(urls).toEqual(['/auth/login'])
  })

  it('serializes array params as comma lists (backend csvList)', () => {
    expect(toQueryParams({ brand: ['Knaus', 'Hymer'], minSeats: 3, search: '', features: [], page: undefined })).toEqual({ brand: 'Knaus,Hymer', minSeats: '3' })
  })
})

describe('toApiError', () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const axiosError = (status: number, data: unknown) =>
    new AxiosError('x', 'x', config, null, { data, status, statusText: '', headers: {}, config } as AxiosResponse)

  it('keeps backend messages and field errors', () => {
    const error = toApiError(axiosError(400, { success: false, message: 'Validation failed', errors: [{ field: 'body.driver.phone', message: 'Invalid phone number' }] }))
    expect(error.status).toBe(400)
    expect(error.fieldMessage('phone')).toBe('Invalid phone number')
    expect(describeError(error)).toBe('Invalid phone number')
  })

  it('hides server internals and handles network failures', () => {
    expect(toApiError(axiosError(500, { success: false, message: 'Something went wrong', errors: [] })).message).toMatch(/on our side/)
    expect(toApiError(new AxiosError('Network Error', 'ERR_NETWORK', config)).message).toMatch(/Cannot reach the server/)
    expect(toApiError(axiosError(429, '<html>')).message).toMatch(/Too many requests/)
  })
})
