import { CAMPER_SORTS, type CamperListParams, type CamperSort } from '@/services/camperApi'
import type { LicenseType } from '@/types/api'
import { isValidISODate } from '@/utils/dates'

/*
 * Listing state lives in the URL query string (shareable, back-button friendly).
 * It maps 1:1 onto GET /campers parameters; filtering, sorting and pagination all
 * happen on the server.
 */

export const SORT_OPTIONS: Record<CamperSort, string> = {
  newest: 'Newest',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating: 'Top rated',
  popular: 'Most popular',
}

export const PER_PAGE_OPTIONS = [12, 24, 48] as const

/** Figma's "Number of travelers" buckets, expressed as the backend's `minSeats`. */
export const TRAVELER_OPTIONS = [
  { label: '2+', minSeats: 2 },
  { label: '3–4+', minSeats: 3 },
  { label: '5+', minSeats: 5 },
] as const

const LICENSE_TYPES: readonly LicenseType[] = ['CLASS1_LARGE', 'CLASS1_ORDINARY', 'CLASS2_ORDINARY', 'SPECIAL_TRAILER']

export interface CamperFilters {
  search: string
  minPrice: number | null
  maxPrice: number | null
  brand: string[]
  company: string[]
  region: string[]
  licenseType: LicenseType[]
  features: string[]
  minSeats: number | null
  startDate: string | null
  endDate: string | null
}

export interface ListingQuery extends CamperFilters {
  sort: CamperSort
  limit: number
  page: number
  view: 'grid' | 'list'
}

export const EMPTY_FILTERS: CamperFilters = {
  search: '',
  minPrice: null,
  maxPrice: null,
  brand: [],
  company: [],
  region: [],
  licenseType: [],
  features: [],
  minSeats: null,
  startDate: null,
  endDate: null,
}

const list = (params: URLSearchParams, key: string) =>
  (params.get(key) ?? '').split(',').map((v) => v.trim()).filter(Boolean)

const nonNegative = (value: string | null) => {
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

const dateParam = (value: string | null) => (value && isValidISODate(value) ? value : null)

export function parseListingQuery(params: URLSearchParams): ListingQuery {
  const sort = params.get('sort')
  const limit = Number(params.get('limit'))
  const page = Number(params.get('page'))
  const startDate = dateParam(params.get('from'))
  const endDate = dateParam(params.get('to'))
  const datesValid = Boolean(startDate && endDate && endDate > startDate)
  return {
    search: params.get('q') ?? '',
    minPrice: nonNegative(params.get('min')),
    maxPrice: nonNegative(params.get('max')),
    brand: list(params, 'brand'),
    company: list(params, 'company'),
    region: list(params, 'region'),
    licenseType: list(params, 'license').filter((v): v is LicenseType => (LICENSE_TYPES as readonly string[]).includes(v)),
    features: list(params, 'feature').filter((id) => /^[a-f\d]{24}$/i.test(id)),
    minSeats: nonNegative(params.get('seats')),
    startDate: datesValid ? startDate : null,
    endDate: datesValid ? endDate : null,
    sort: sort && (CAMPER_SORTS as readonly string[]).includes(sort) ? (sort as CamperSort) : 'newest',
    limit: (PER_PAGE_OPTIONS as readonly number[]).includes(limit) ? limit : PER_PAGE_OPTIONS[0],
    page: Number.isInteger(page) && page > 0 ? page : 1,
    view: params.get('view') === 'list' ? 'list' : 'grid',
  }
}

export function listingQueryToParams(query: Partial<ListingQuery>): URLSearchParams {
  const params = new URLSearchParams()
  const setList = (key: string, values?: string[]) => {
    if (values?.length) params.set(key, values.join(','))
  }
  if (query.search?.trim()) params.set('q', query.search.trim())
  if (query.minPrice != null) params.set('min', String(query.minPrice))
  if (query.maxPrice != null) params.set('max', String(query.maxPrice))
  setList('brand', query.brand)
  setList('company', query.company)
  setList('region', query.region)
  setList('license', query.licenseType)
  setList('feature', query.features)
  if (query.minSeats) params.set('seats', String(query.minSeats))
  if (query.startDate && query.endDate) {
    params.set('from', query.startDate)
    params.set('to', query.endDate)
  }
  if (query.sort && query.sort !== 'newest') params.set('sort', query.sort)
  if (query.limit && query.limit !== PER_PAGE_OPTIONS[0]) params.set('limit', String(query.limit))
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.view === 'list') params.set('view', 'list')
  return params
}

/** Converts URL state into the GET /campers request for one category (or all). */
export function toCamperListParams(query: ListingQuery, category: string | null): CamperListParams {
  return {
    page: query.page,
    limit: query.limit,
    sort: query.sort,
    search: query.search.trim() || undefined,
    category: category ?? undefined,
    brand: query.brand,
    company: query.company,
    region: query.region,
    licenseType: query.licenseType,
    features: query.features,
    minPrice: query.minPrice ?? undefined,
    maxPrice: query.maxPrice ?? undefined,
    minSeats: query.minSeats ?? undefined,
    startDate: query.startDate ?? undefined,
    endDate: query.endDate ?? undefined,
  }
}

export function countActiveFilters(filters: CamperFilters): number {
  return (
    (filters.search ? 1 : 0) +
    (filters.minPrice != null ? 1 : 0) +
    (filters.maxPrice != null ? 1 : 0) +
    filters.brand.length +
    filters.company.length +
    filters.region.length +
    filters.licenseType.length +
    filters.features.length +
    (filters.minSeats ? 1 : 0) +
    (filters.startDate ? 1 : 0)
  )
}
