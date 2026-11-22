import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { AxiosRequestConfig } from 'axios'
import type { ApiSuccess } from '@/types/api'
import { serializeError, type SerializedApiError } from './errors'
import { httpClient, toQueryParams } from './httpClient'

export interface RequestArgs {
  url: string
  method?: AxiosRequestConfig['method']
  params?: object
  body?: unknown
  /** List endpoints: return `{ items, meta }` instead of just `data`. */
  paginated?: boolean
}

/**
 * Bridges RTK Query to the shared axios client (cookie auth + refresh) and
 * unwraps the backend envelope `{ success, message, data, meta }`.
 */
const axiosBaseQuery: BaseQueryFn<RequestArgs, unknown, SerializedApiError> = async ({ url, method = 'GET', params, body, paginated }) => {
  try {
    const response = await httpClient.request<ApiSuccess<unknown>>({
      url,
      method,
      params: params ? toQueryParams(params) : undefined,
      data: body,
    })
    const envelope = response.data
    if (paginated) {
      return { data: { items: envelope.data, meta: envelope.meta } }
    }
    return { data: envelope.data }
  } catch (error) {
    return { error: serializeError(error) }
  }
}

/**
 * One API slice for the whole dashboard. Cache tags keep lists, details and
 * analytics consistent after mutations (e.g. confirming a booking refreshes
 * the booking list, its detail page and the dashboard KPIs).
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Me', 'Booking', 'Camper', 'Customer', 'Payment', 'Analytics', 'Notification', 'Settings', 'Admin', 'Catalog'],
  keepUnusedDataFor: 60,
  refetchOnReconnect: true,
  endpoints: () => ({}),
})

/** Tags invalidated by anything that changes money or booking state. */
export const BUSINESS_TAGS = ['Booking', 'Payment', 'Analytics', 'Camper', 'Customer'] as const
