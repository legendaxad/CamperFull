import {
  AirVent,
  Bath,
  Bike,
  Camera,
  CookingPot,
  Flame,
  Navigation,
  PawPrint,
  Refrigerator,
  ShowerHead,
  Sparkles,
  Sun,
  Tent,
  Tv,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import type { ApiFuelType, ApiTransmission, BookingStatus, CamperCardData, ImageDto, LicenseType } from '@/types/api'

/** First image is the cover (the backend keeps images in display order). */
export function coverImage(camper: { images: ImageDto[] }): string {
  return camper.images[0]?.url ?? ''
}

/** Transparent PNG cut-outs (Figma style) use `object-contain`; photos use `object-cover`. */
export function isCutoutImage(src: string): boolean {
  return /\.png($|\?)/i.test(src) && !src.startsWith('data:')
}

export function camperSubtitle(camper: Pick<CamperCardData, 'brand' | 'company'>): string {
  return [camper.brand, camper.company].filter(Boolean).join(' · ')
}

export function camperLocation(camper: Pick<CamperCardData, 'location'>): string {
  return [camper.location.city, camper.location.region].filter(Boolean).join(', ')
}

export const LICENSE_LABELS: Record<LicenseType, string> = {
  CLASS1_LARGE: 'Class 1 large (1종 대형)',
  CLASS1_ORDINARY: 'Class 1 ordinary (1종 보통)',
  CLASS2_ORDINARY: 'Class 2 ordinary (2종 보통)',
  SPECIAL_TRAILER: 'Special trailer (특수 트레일러)',
}

export const FUEL_TYPE_LABELS: Record<ApiFuelType, string> = {
  DIESEL: 'Diesel',
  GASOLINE: 'Gasoline',
  LPG: 'LPG',
  HYBRID: 'Hybrid',
  ELECTRIC: 'Electric',
  NONE: 'Not motorised',
}

export const TRANSMISSION_LABELS: Record<ApiTransmission, string> = {
  MANUAL: 'Manual',
  AUTOMATIC: 'Automatic',
  NONE: 'None (towed)',
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  ACTIVE: 'On the road',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
}

export const BOOKING_STATUS_TONES: Record<BookingStatus, 'brand' | 'success' | 'accent' | 'muted' | 'danger'> = {
  PENDING: 'accent',
  CONFIRMED: 'success',
  ACTIVE: 'brand',
  COMPLETED: 'muted',
  CANCELLED: 'danger',
  REJECTED: 'danger',
}

/** Backend features carry a free-text `icon` key (admin-managed); unknown keys get a generic icon. */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  heater: Flame,
  heating: Flame,
  solar: Sun,
  kitchen: CookingPot,
  shower: ShowerHead,
  bathroom: Bath,
  ac: AirVent,
  awning: Tent,
  fridge: Refrigerator,
  refrigerator: Refrigerator,
  wifi: Wifi,
  tv: Tv,
  bike: Bike,
  camera: Camera,
  navigation: Navigation,
  pet: PawPrint,
}

export function featureIcon(icon: string | undefined): LucideIcon {
  return (icon && FEATURE_ICONS[icon.toLowerCase()]) || Sparkles
}

export function mmToMeters(mm: number | undefined): string | null {
  return mm ? `${(mm / 1000).toFixed(2)} m` : null
}
