import axios, { type InternalAxiosRequestConfig } from 'axios'

/*
 * HTTP client for the admin API (`/api/v1/admin`).
 *
 * Authentication uses the backend's HTTP-only admin cookies (`fc_admin_access`,
 * `fc_admin_refresh`); this app never sees or stores a token. On a 401 the
 * client calls POST /auth/refresh once (shared by concurrent requests) and
 * replays the request. If refreshing fails, the registered handler signs the
 * admin out.
 */
const API_ROOT = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1'

export const httpClient = axios.create({
  baseURL: `${API_ROOT}/admin`,
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
})

/** A 401 here means "bad credentials / no session", not "access token expired". */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshInFlight: Promise<void> | null = null
let onSessionExpired: () => void = () => {}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

function refreshSession(): Promise<void> {
  refreshInFlight ??= httpClient
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

httpClient.interceptors.response.use(undefined, async (error: unknown) => {
  const config = (error as { config?: RetriableConfig }).config
  const status = (error as { response?: { status?: number } }).response?.status
  const path = config?.url ?? ''
  if (status === 401 && config && !config._retried && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    config._retried = true
    try {
      await refreshSession()
      return httpClient.request(config)
    } catch {
      onSessionExpired()
    }
  }
  return Promise.reject(error)
})

/** Serializes arrays as comma lists (backend `csvList`) and drops empty values. */
export function toQueryParams(params: object): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',')
    } else {
      out[key] = String(value)
    }
  }
  return out
}
