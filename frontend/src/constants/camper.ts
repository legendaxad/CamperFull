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
  Sun,
  Tent,
  Tv,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

/** Marketplace sections — mirror the main navigation in the Figma "main nav" component. */
export const CAMPER_CATEGORIES = ['motor', 'caravan', 'tuning', 'used'] as const
export type CamperCategory = (typeof CAMPER_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<CamperCategory, { nav: string; plural: string }> = {
  motor: { nav: 'Motor', plural: 'Motors' },
  caravan: { nav: 'Caravan', plural: 'Caravans' },
  tuning: { nav: 'Tuning', plural: 'Tuning' },
  used: { nav: 'Used Car', plural: 'Used cars' },
}

export const CAMPER_TYPES = ['motorhome', 'campervan', 'caravan', 'trailer', 'pop-up'] as const
export type CamperType = (typeof CAMPER_TYPES)[number]

export const CAMPER_TYPE_LABELS: Record<CamperType, string> = {
  motorhome: 'Motorhome',
  campervan: 'Campervan',
  caravan: 'Caravan',
  trailer: 'Travel trailer',
  'pop-up': 'Pop-up camper',
}

export const TRANSMISSIONS = ['manual', 'automatic'] as const
export type Transmission = (typeof TRANSMISSIONS)[number]

export const FUEL_TYPES = ['diesel', 'petrol', 'hybrid', 'electric', 'lpg', 'none'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const FUEL_LABELS: Record<FuelType, string> = {
  diesel: 'Diesel',
  petrol: 'Petrol',
  hybrid: 'Hybrid',
  electric: 'Electric',
  lpg: 'LPG',
  none: 'Not motorised',
}

export const CONDITIONS = ['new', 'used'] as const
export type Condition = (typeof CONDITIONS)[number]

export const FEATURE_KEYS = [
  'kitchen',
  'bathroom',
  'shower',
  'heating',
  'airConditioning',
  'refrigerator',
  'solarPanels',
  'wifi',
  'tv',
  'bikeRack',
  'awning',
  'parkingCamera',
  'navigation',
  'petFriendly',
] as const
export type FeatureKey = (typeof FEATURE_KEYS)[number]

export const FEATURES: Record<FeatureKey, { label: string; hint: string; icon: LucideIcon }> = {
  kitchen: { label: 'Kitchen', hint: 'Hob, sink & cookware', icon: CookingPot },
  bathroom: { label: 'Bathroom', hint: 'Private toilet', icon: Bath },
  shower: { label: 'Shower', hint: 'Hot water on board', icon: ShowerHead },
  heating: { label: 'Heating', hint: 'Warm in every season', icon: Flame },
  airConditioning: { label: 'Air conditioning', hint: 'Cab & living area', icon: AirVent },
  refrigerator: { label: 'Refrigerator', hint: 'Keeps food fresh', icon: Refrigerator },
  solarPanels: { label: 'Solar panels', hint: 'Off-grid power', icon: Sun },
  wifi: { label: 'Wi-Fi', hint: 'Mobile hotspot', icon: Wifi },
  tv: { label: 'TV', hint: 'Screen & antenna', icon: Tv },
  bikeRack: { label: 'Bike rack', hint: 'Carries 2–4 bikes', icon: Bike },
  awning: { label: 'Awning', hint: 'Shade outside', icon: Tent },
  parkingCamera: { label: 'Parking camera', hint: 'Rear-view camera', icon: Camera },
  navigation: { label: 'Navigation', hint: 'Built-in GPS', icon: Navigation },
  petFriendly: { label: 'Pet friendly', hint: 'Pets welcome', icon: PawPrint },
}

export const COMPARE_LIMIT = 3
export const MAX_PHOTOS = 8
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const CURRENCY = 'USD'
