import { z } from 'zod'
import {
  CAMPER_CATEGORIES,
  CAMPER_TYPES,
  CONDITIONS,
  FEATURE_KEYS,
  FUEL_TYPES,
  MAX_PHOTOS,
  TRANSMISSIONS,
} from '@/constants/camper'
import { isValidISODate, nightsBetween, todayISO } from '@/utils/dates'

/*
 * Validation for every wizard step.
 * Form inputs keep raw string values (exactly what the user typed) so drafts can be
 * persisted and restored losslessly; each schema transforms them into typed output
 * (numbers, enums) only when a step is submitted or the listing is published.
 */

const text = (label: string, min = 1, max = 120) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)

interface NumberRule {
  min: number
  max: number
  int?: boolean
  unit?: string
}

const numberSchema = (label: string, { min, max, int, unit = '' }: NumberRule) => {
  let schema = z
    .number({ error: `${label} must be a number` })
    .min(min, `${label} must be at least ${min}${unit}`)
    .max(max, `${label} must be at most ${max}${unit}`)
  if (int) schema = schema.int(`${label} must be a whole number`)
  return schema
}

/** Required numeric field entered as text. */
const num = (label: string, rule: NumberRule) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .transform(Number)
    .pipe(numberSchema(label, rule))

/** Optional numeric field — an empty value means 0. */
const optionalNum = (label: string, rule: NumberRule) =>
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? 0 : Number(value)))
    .pipe(numberSchema(label, rule))

const isoDate = (label: string) =>
  z.string().refine(isValidISODate, `${label} must be a valid date`)

const CURRENT_YEAR = new Date().getFullYear()

export const basicsSchema = z.object({
  title: text('Camper title', 5, 80),
  brand: text('Brand', 1, 40),
  model: text('Model', 1, 60),
  year: num('Manufacturing year', { min: 1970, max: CURRENT_YEAR + 1, int: true }),
  type: z.enum(CAMPER_TYPES, { error: 'Choose a camper type' }),
  category: z.enum(CAMPER_CATEGORIES, { error: 'Choose a marketplace section' }),
  description: text('Description', 40, 2000),
  passengers: num('Passengers', { min: 1, max: 12, int: true }),
  sleepingPlaces: num('Sleeping places', { min: 1, max: 10, int: true }),
})

export const specsSchema = z.object({
  lengthM: num('Length', { min: 3, max: 15, unit: ' m' }),
  widthM: num('Width', { min: 1.5, max: 3, unit: ' m' }),
  heightM: num('Height', { min: 1.5, max: 4.5, unit: ' m' }),
  weightKg: num('Weight', { min: 300, max: 12000, int: true, unit: ' kg' }),
  engineType: text('Engine type', 2, 60),
  transmission: z.enum(TRANSMISSIONS, { error: 'Choose a transmission' }),
  fuelType: z.enum(FUEL_TYPES, { error: 'Choose a fuel type' }),
  mileageKm: num('Mileage', { min: 0, max: 2_000_000, int: true, unit: ' km' }),
  condition: z.enum(CONDITIONS),
  registrationNumber: text('Registration number', 2, 20).regex(
    /^[\p{L}\p{N} -]+$/u,
    'Use letters, numbers, spaces or dashes only',
  ),
  registrationCountry: text('Registration country', 2, 56),
})

export const featuresSchema = z.object({
  features: z.array(z.enum(FEATURE_KEYS)).min(1, 'Select at least one feature'),
})

export const photoSchema = z.object({
  id: z.string(),
  src: z.string().min(1),
  name: z.string(),
  sizeBytes: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  isCover: z.boolean(),
})

export const photosSchema = z
  .array(photoSchema)
  .min(1, 'Add at least one photo of your camper')
  .max(MAX_PHOTOS, `You can upload up to ${MAX_PHOTOS} photos`)
  .refine((photos) => photos.filter((p) => p.isCover).length === 1, 'Choose one cover photo')

export const locationSchema = z.object({
  country: text('Country', 2, 56),
  city: text('City', 2, 60),
  address: text('Pickup address', 5, 160),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/, 'Enter a valid postal code'),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).nullable(),
})

export const feeSchema = z.object({
  id: z.string(),
  label: text('Fee name', 2, 40),
  amount: num('Fee amount', { min: 0, max: 5_000_000, int: true, unit: ' ₩' }),
  per: z.enum(['stay', 'day']),
})

export const pricingSchema = z
  .object({
    // Whole KRW amounts, matching the marketplace currency.
    dailyPrice: num('Daily price', { min: 10_000, max: 5_000_000, int: true, unit: ' ₩' }),
    weeklyDiscountPct: optionalNum('Weekly discount', { min: 0, max: 90, unit: '%' }),
    monthlyDiscountPct: optionalNum('Monthly discount', { min: 0, max: 90, unit: '%' }),
    securityDeposit: optionalNum('Security deposit', { min: 0, max: 20_000_000, int: true, unit: ' ₩' }),
    minRentalDays: num('Minimum rental', { min: 1, max: 60, int: true, unit: ' days' }),
    availableFrom: isoDate('Start date'),
    availableTo: isoDate('End date'),
    additionalFees: z.array(feeSchema).max(6, 'Up to 6 additional fees'),
  })
  .superRefine((value, ctx) => {
    if (!isValidISODate(value.availableFrom) || !isValidISODate(value.availableTo)) return
    if (value.availableTo < todayISO()) {
      ctx.addIssue({ code: 'custom', path: ['availableTo'], message: 'End date cannot be in the past' })
    }
    const nights = nightsBetween(value.availableFrom, value.availableTo)
    if (nights < value.minRentalDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['availableTo'],
        message: 'Availability window must be longer than the minimum rental',
      })
    }
  })

export const listingDraftSchema = z.object({
  basics: basicsSchema,
  specs: specsSchema,
  features: featuresSchema.shape.features,
  photos: photosSchema,
  location: locationSchema,
  pricing: pricingSchema,
})
