import type { CamperListing, CamperOwner } from '@/types/camper'
import { addDaysISO, todayISO } from '@/utils/dates'
import type { ListingDraft, ListingValues } from './publishingTypes'

export function createEmptyDraft(): ListingDraft {
  const start = todayISO()
  return {
    basics: {
      title: '',
      brand: '',
      model: '',
      year: '',
      type: 'motorhome',
      category: 'motor',
      description: '',
      passengers: '',
      sleepingPlaces: '',
    },
    specs: {
      lengthM: '',
      widthM: '',
      heightM: '',
      weightKg: '',
      engineType: '',
      transmission: 'manual',
      fuelType: 'diesel',
      mileageKm: '',
      condition: 'used',
      registrationNumber: '',
      registrationCountry: '',
    },
    features: [],
    photos: [],
    location: { country: '', city: '', address: '', postalCode: '', coordinates: null },
    pricing: {
      dailyPrice: '',
      weeklyDiscountPct: '',
      monthlyDiscountPct: '',
      securityDeposit: '',
      minRentalDays: '2',
      availableFrom: start,
      availableTo: addDaysISO(start, 180),
      additionalFees: [],
    },
  }
}

const str = (value: number) => String(value)

/** Converts a stored listing back into editable raw form values. */
export function listingToDraft(listing: CamperListing): ListingDraft {
  const { basics, specs, location, pricing } = listing
  return {
    basics: {
      ...basics,
      year: str(basics.year),
      passengers: str(basics.passengers),
      sleepingPlaces: str(basics.sleepingPlaces),
    },
    specs: {
      ...specs,
      lengthM: str(specs.lengthM),
      widthM: str(specs.widthM),
      heightM: str(specs.heightM),
      weightKg: str(specs.weightKg),
      mileageKm: str(specs.mileageKm),
    },
    features: [...listing.features],
    photos: listing.photos.map((photo) => ({ ...photo })),
    location: { ...location },
    pricing: {
      ...pricing,
      dailyPrice: str(pricing.dailyPrice),
      weeklyDiscountPct: str(pricing.weeklyDiscountPct),
      monthlyDiscountPct: str(pricing.monthlyDiscountPct),
      securityDeposit: str(pricing.securityDeposit),
      minRentalDays: str(pricing.minRentalDays),
      additionalFees: pricing.additionalFees.map((fee) => ({ ...fee, amount: str(fee.amount) })),
    },
  }
}

interface BuildContext {
  id: string
  owner: CamperOwner
  existing: CamperListing | null
  now: string
}

/** Builds the listing entity from fully validated wizard values. */
export function buildListing(values: ListingValues, { id, owner, existing, now }: BuildContext): CamperListing {
  // Cover photo first so every card/gallery can simply use photos[0].
  const photos = [...values.photos].sort((a, b) => Number(b.isCover) - Number(a.isCover))
  return {
    id,
    owner,
    status: 'published',
    basics: values.basics,
    specs: values.specs,
    features: values.features,
    photos,
    location: values.location,
    pricing: values.pricing,
    rating: existing?.rating ?? 0,
    reviewCount: existing?.reviewCount ?? 0,
    badge: existing ? existing.badge : 'new',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt ?? now,
  }
}
