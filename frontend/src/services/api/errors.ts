import { AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorDetail } from '@/types/api'

/**
 * The single error type the UI deals with. Raw Axios errors never reach components:
 * every failure is converted into a short, customer-safe message plus optional
 * per-field details from the backend's validation errors.
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

  get isUnauthorized() {
    return this.status === 401
  }

  /** Field errors keyed by their last path segment, e.g. `body.driver.phone` -> `phone`. */
  fieldMessage(field: string): string | undefined {
    return this.fieldErrors.find((e) => e.field === field || e.field?.endsWith(`.${field}`))?.message
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && (value as { success?: unknown }).success === false &&
    typeof (value as { message?: unknown }).message === 'string'
}

const FALLBACK_BY_STATUS: Record<number, string> = {
  401: 'Please sign in to continue.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  429: 'Too many requests. Please wait a moment and try again.',
  503: 'This service is temporarily unavailable.',
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError('Cannot reach the server. Check your connection and try again.', null)
    }
    const { status, data } = error.response
    if (isErrorBody(data)) {
      // 5xx messages are generic on the backend already; keep them, but never expose internals.
      const message = status >= 500 ? 'Something went wrong on our side. Please try again.' : data.message
      return new ApiError(message, status, Array.isArray(data.errors) ? data.errors : [])
    }
    return new ApiError(FALLBACK_BY_STATUS[status] ?? 'Something went wrong. Please try again.', status)
  }
  return new ApiError('Something went wrong. Please try again.', null)
}

/** Message for toasts: the backend message, plus the first field error when it says "Validation failed". */
export function describeError(error: unknown): string {
  const apiError = toApiError(error)
  const first = apiError.fieldErrors[0]
  if (first && /validation failed/i.test(apiError.message)) return first.message
  return apiError.message
}
