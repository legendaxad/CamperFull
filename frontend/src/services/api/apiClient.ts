import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { ApiSuccess, Paginated } from '@/types/api'
import { toApiError } from './errors'

/*
 * Centralized HTTP client for the FullCamper backend.
 *
 * Authentication: the backend issues HTTP-only cookies (`fc_access`, `fc_refresh`);
 * tokens are never readable by JavaScript and never stored by the frontend. We only
 * have to send credentials and, when an access token expires (401), call
 * POST /auth/refresh once and replay the request.
 *
 * Base URL: `VITE_API_BASE_URL` (e.g. https://api.example.com/api/v1). In development
 * it defaults to `/api/v1`, which the Vite dev server proxies to the backend.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
})

/** Endpoints where a 401 means "wrong credentials / no session", not "token expired". */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout', '/auth/forgot-password', '/auth/reset-password']

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

let refreshInFlight: Promise<void> | null = null
let onSessionExpired: () => void = () => {}

/** The store registers a callback so the client never imports Redux (avoids circular deps). */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler
}

/** Single-flight refresh: concurrent 401s share one POST /auth/refresh. */
function refreshSession(): Promise<void> {
  refreshInFlight ??= apiClient
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  const config = (error as { config?: RetriableConfig }).config
  const status = (error as { response?: { status?: number } }).response?.status
  const path = config?.url ?? ''
  const shouldRefresh = status === 401 && config && !config._retried && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))

  if (shouldRefresh) {
    config._retried = true
    try {
      await refreshSession()
      return apiClient.request(config)
    } catch {
      onSessionExpired()
    }
  }
  return Promise.reject(toApiError(error))
})

/* ---- Typed helpers: always unwrap the backend envelope `{ success, message, data, meta }` ---- */

export async function getEnvelope<T>(url: string, config?: AxiosRequestConfig): Promise<ApiSuccess<T>> {
  const response = await apiClient.get<ApiSuccess<T>>(url, config)
  return response.data
}

export async function getData<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return (await getEnvelope<T>(url, config)).data
}

/** For list endpoints that return `data: T[]` plus pagination `meta`. */
export async function getPaginated<T>(url: string, config?: AxiosRequestConfig): Promise<Paginated<T>> {
  const envelope = await getEnvelope<T[]>(url, config)
  if (!envelope.meta) throw new Error(`Expected pagination metadata from ${url}`)
  return { items: envelope.data, meta: envelope.meta }
}

export async function postData<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.post<ApiSuccess<T>>(url, body, config)
  return response.data.data
}

export async function patchData<T>(url: string, body?: unknown): Promise<T> {
  const response = await apiClient.patch<ApiSuccess<T>>(url, body)
  return response.data.data
}

export async function putData<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.put<ApiSuccess<T>>(url, body, config)
  return response.data.data
}

export async function deleteData<T>(url: string): Promise<T> {
  const response = await apiClient.delete<ApiSuccess<T>>(url)
  return response.data.data
}

/** Serializes arrays as comma lists, matching the backend's `csvList` query parsing. */
export function toQueryParams(params: Record<string, unknown>): Record<string, string> {
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
