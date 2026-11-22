import type {
  Camper,
  CamperAvailability,
  CamperFilterOptions,
  CampingPlace,
  Category,
  Feature,
  LicenseType,
  Paginated,
  PublicSettings,
  ReviewListResponse,
} from '@/types/api'
import { apiClient, getData, getPaginated, postData, toQueryParams } from './api/apiClient'
import { ENDPOINTS } from './api/endpoints'

/** Sort keys accepted by GET /campers (validators/catalog.validator.ts). */
export const CAMPER_SORTS = ['newest', 'price_asc', 'price_desc', 'rating', 'popular'] as const
export type CamperSort = (typeof CAMPER_SORTS)[number]

/** Query accepted by GET /campers. Arrays are sent as comma-separated lists. */
export interface CamperListParams {
  page?: number
  limit?: number
  search?: string
  category?: string
  brand?: string[]
  company?: string[]
  region?: string[]
  licenseType?: LicenseType[]
  features?: string[]
  minPrice?: number
  maxPrice?: number
  minSeats?: number
  minSleeps?: number
  featured?: boolean
  startDate?: string
  endDate?: string
  sort?: CamperSort
}


/** Public catalog — backend/src/routes/catalog.routes.ts */
export const camperApi = {
  async list(params: CamperListParams, signal?: AbortSignal): Promise<Paginated<Camper>> {
    return getPaginated<Camper>(ENDPOINTS.campers.list, { params: toQueryParams({ ...params }), signal })
  },
  get(idOrSlug: string): Promise<Camper> {
    return getData<Camper>(ENDPOINTS.campers.detail(idOrSlug))
  },
  filters(): Promise<CamperFilterOptions> {
    return getData<CamperFilterOptions>(ENDPOINTS.campers.filters)
  },
  /** 2–4 ids; result keeps the requested order and drops archived campers. */
  compare(ids: string[]): Promise<Camper[]> {
    return getData<Camper[]>(ENDPOINTS.campers.compare, { params: { ids: ids.join(',') } })
  },
  availability(idOrSlug: string, from: string, to: string): Promise<CamperAvailability> {
    return getData<CamperAvailability>(ENDPOINTS.campers.availability(idOrSlug), { params: { from, to } })
  },
  async reviews(idOrSlug: string, params: { page?: number; limit?: number; sort?: 'newest' | 'highest' | 'lowest' }) {
    const response = await apiClient.get<ReviewListResponse>(ENDPOINTS.campers.reviews(idOrSlug), { params })
    return response.data
  },
}

/** Reference data & editorial content managed in the admin dashboard. */
export const catalogApi = {
  categories(): Promise<Category[]> {
    return getData<Category[]>(ENDPOINTS.categories)
  },
  features(): Promise<Feature[]> {
    return getData<Feature[]>(ENDPOINTS.features)
  },
  async campingPlaces(params: { page?: number; limit?: number; search?: string; region?: string }): Promise<Paginated<CampingPlace>> {
    return getPaginated<CampingPlace>(ENDPOINTS.campingPlaces, { params: toQueryParams(params) })
  },
  settings(): Promise<PublicSettings> {
    return getData<PublicSettings>(ENDPOINTS.settings)
  },
}

export interface InquiryRequest {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  camperId?: string
}

export const inquiryApi = {
  async create(body: InquiryRequest): Promise<void> {
    await postData<{ _id: string }>(ENDPOINTS.inquiries, body)
  },
}
