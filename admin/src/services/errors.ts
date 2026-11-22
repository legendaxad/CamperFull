import { AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorDetail } from '@/types/api'

/**
 * The only error type the UI sees. Raw Axios errors never reach components:
 * failures become a short, safe message plus the backend's per-field details.
 */
export class ApiError extends Error {
  readonly status: number | null
  readonly fieldErrors: ApiErrorDetail[]

  constructor(message: string, status: number | null, fieldErrors: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

/** Serializable shape stored by RTK Query (class instances must not enter the store). */
export interface SerializedApiError {
  message: string
  status: number | null
  fieldErrors: ApiErrorDetail[]
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { success?: unknown }).success === false &&
    typeof (value as { message?: unknown }).message === 'string'
  )
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  401: 'Your session has ended. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'The requested record was not found.',
  429: 'Too many requests. Please wait a moment and try again.',
  502: 'The payment provider did not respond. Please try again.',
  503: 'This service is temporarily unavailable.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (!error.response) return new ApiError('Cannot reach the server. Check your connection and try again.', null)
    const { status, data } = error.response
    if (isErrorBody(data)) {
      const message = status >= 500 && status !== 502 && status !== 503 ? 'Something went wrong on the server. Please try again.' : data.message
      return new ApiError(message, status, Array.isArray(data.errors) ? data.errors : [])
    }
    return new ApiError(FALLBACK_BY_STATUS[status] ?? 'Something went wrong. Please try again.', status)
  }
  return new ApiError('Something went wrong. Please try again.', null)
}

export function serializeError(error: unknown): SerializedApiError {
  const apiError = toApiError(error)
  return { message: apiError.message, status: apiError.status, fieldErrors: apiError.fieldErrors }
}

function isSerializedError(value: unknown): value is SerializedApiError {
  return typeof value === 'object' && value !== null && typeof (value as { message?: unknown }).message === 'string' && 'fieldErrors' in value
}

/** Human message for any error (RTK Query error object, ApiError, unknown). */
export function describeError(error: unknown): string {
  if (isSerializedError(error)) {
    const first = error.fieldErrors[0]
    if (first && /validation failed/i.test(error.message)) return first.message
    return error.message
  }
  if (error instanceof Error) return toApiError(error).message
  return 'Something went wrong. Please try again.'
}

export function errorStatus(error: unknown): number | null {
  return isSerializedError(error) ? error.status : null
}

/** Field errors keyed by last path segment (`body.pricing.dailyRate` -> `dailyRate`). */
export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!isSerializedError(error)) return {}
  const map: Record<string, string> = {}
  for (const detail of error.fieldErrors) {
    if (!detail.field) continue
    const key = detail.field.replace(/^(body|query|params)\./, '')
    map[key] ??= detail.message
  }
  return map
}
