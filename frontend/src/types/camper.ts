import type {
  CamperCategory,
  CamperType,
  Condition,
  FeatureKey,
  FuelType,
  Transmission,
} from '@/constants/camper'

/*
 * Model of a listing created in the camper-publishing wizard.
 * These listings are stored in the browser only: the backend currently creates campers
 * through the admin dashboard (see types/api.ts for the marketplace `Camper` returned by the API).
 */

export type ListingStatus = 'published' | 'unlisted'

export interface CamperPhoto {
  id: string
  /** Persistable image source: a bundled asset URL, a compressed data URL, or (later) a CDN URL. */
  src: string
  name: string
  sizeBytes: number
  width: number | null
  height: number | null
  isCover: boolean
}

export interface CamperBasics {
  title: string
  brand: string
  model: string
  year: number
  type: CamperType
  category: CamperCategory
  description: string
  passengers: number
  sleepingPlaces: number
}

export interface CamperSpecs {
  lengthM: number
  widthM: number
  heightM: number
  weightKg: number
  engineType: string
  transmission: Transmission
  fuelType: FuelType
  mileageKm: number
  condition: Condition
  registrationNumber: string
  registrationCountry: string
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface CamperLocation {
  country: string
  city: string
  address: string
  postalCode: string
  /** Reserved for future geolocation / map integration. */
  coordinates: GeoPoint | null
}

export interface AdditionalFee {
  id: string
  label: string
  amount: number
  per: 'stay' | 'day'
}

export interface CamperPricing {
  dailyPrice: number
  weeklyDiscountPct: number
  monthlyDiscountPct: number
  securityDeposit: number
  minRentalDays: number
  availableFrom: string
  availableTo: string
  additionalFees: AdditionalFee[]
}

export interface CamperOwner {
  id: string
  name: string
  avatarUrl: string | null
}

export interface CamperListing {
  id: string
  owner: CamperOwner
  status: ListingStatus
  basics: CamperBasics
  specs: CamperSpecs
  features: FeatureKey[]
  photos: CamperPhoto[]
  location: CamperLocation
  pricing: CamperPricing
  rating: number
  reviewCount: number
  badge: 'best' | 'new' | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}
