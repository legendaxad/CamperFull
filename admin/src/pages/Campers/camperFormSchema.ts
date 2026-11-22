import { z } from 'zod'
import type { CamperInput } from '@/services/endpoints'
import { CAMPER_STATUSES, FUEL_TYPES, LICENSE_TYPES, TRANSMISSIONS, type Camper } from '@/types/api'

/*
 * Form model for creating/editing a camper. Numeric inputs are kept as
 * strings while editing and converted on submit; the rules mirror the
 * backend's camperCreateSchema so most errors are caught before the request.
 */
const text = (label: string, max: number) => z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`)
const optionalText = (max: number) => z.string().trim().max(max, `Maximum ${max} characters`)
const wholeNumber = (label: string, { min = 0, max, required = false }: { min?: number; max?: number; required?: boolean } = {}) =>
  z
    .string()
    .trim()
    .refine((value) => (required ? value !== '' : true), `${label} is required`)
    .refine((value) => value === '' || /^\d+$/.test(value), `${label} must be a whole number`)
    .refine((value) => value === '' || Number(value) >= min, `${label} must be at least ${min}`)
    .refine((value) => value === '' || max === undefined || Number(value) <= max, `${label} must be at most ${max}`)

export const camperFormSchema = z
  .object({
    name: text('Name', 120),
    category: z.string().min(1, 'Choose a category'),
    features: z.array(z.string()),
    description: text('Description', 5000),
    highlights: z.array(z.object({ title: text('Title', 120), description: text('Description', 2000) })).max(10),
    brand: optionalText(80),
    company: optionalText(120),
    baseVehicle: optionalText(120),
    modelYear: wholeNumber('Model year', { min: 1950, max: 2100 }),
    licenseType: z.enum(LICENSE_TYPES),
    seats: wholeNumber('Seats', { min: 1, max: 20, required: true }),
    sleeps: wholeNumber('Berths', { min: 0, max: 20, required: true }),
    lengthMm: wholeNumber('Length'),
    widthMm: wholeNumber('Width'),
    heightMm: wholeNumber('Height'),
    weightKg: wholeNumber('Weight'),
    fuelType: z.enum(FUEL_TYPES),
    transmission: z.enum(TRANSMISSIONS),
    engine: optionalText(120),
    mileageKm: wholeNumber('Mileage'),
    region: text('Region', 80),
    city: optionalText(80),
    address: optionalText(300),
    pickupNotes: optionalText(1000),
    dailyRate: wholeNumber('Daily rate', { min: 1, required: true }),
    weekendDailyRate: wholeNumber('Weekend rate'),
    cleaningFee: wholeNumber('Cleaning fee'),
    securityDeposit: wholeNumber('Security deposit'),
    extras: z
      .array(
        z.object({
          _id: z.string().optional(),
          name: text('Extra name', 80),
          price: wholeNumber('Price', { required: true }),
          chargeType: z.enum(['PER_BOOKING', 'PER_NIGHT']),
          maxQuantity: wholeNumber('Max quantity', { min: 1, max: 20, required: true }),
        }),
      )
      .max(30),
    minNights: wholeNumber('Minimum nights', { min: 1, max: 365, required: true }),
    maxNights: wholeNumber('Maximum nights', { min: 1, max: 365, required: true }),
    status: z.enum(CAMPER_STATUSES),
    isFeatured: z.boolean(),
  })
  .refine((data) => !data.minNights || !data.maxNights || Number(data.minNights) <= Number(data.maxNights), {
    path: ['maxNights'],
    message: 'Must be at least the minimum nights',
  })

export type CamperFormValues = z.infer<typeof camperFormSchema>

const str = (value: number | undefined) => (value === undefined || value === null ? '' : String(value))

export function emptyCamperForm(): CamperFormValues {
  return {
    name: '',
    category: '',
    features: [],
    description: '',
    highlights: [],
    brand: '',
    company: '',
    baseVehicle: '',
    modelYear: '',
    licenseType: 'CLASS1_ORDINARY',
    seats: '4',
    sleeps: '4',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    weightKg: '',
    fuelType: 'DIESEL',
    transmission: 'AUTOMATIC',
    engine: '',
    mileageKm: '',
    region: '',
    city: '',
    address: '',
    pickupNotes: '',
    dailyRate: '',
    weekendDailyRate: '',
    cleaningFee: '0',
    securityDeposit: '0',
    extras: [],
    minNights: '1',
    maxNights: '30',
    status: 'AVAILABLE',
    isFeatured: false,
  }
}

export function camperToForm(camper: Camper): CamperFormValues {
  return {
    name: camper.name,
    category: camper.category?._id ?? '',
    features: camper.features.map((feature) => feature._id),
    description: camper.description,
    highlights: camper.highlights.map((highlight) => ({ title: highlight.title, description: highlight.description })),
    brand: camper.brand ?? '',
    company: camper.company ?? '',
    baseVehicle: camper.baseVehicle ?? '',
    modelYear: str(camper.modelYear),
    licenseType: camper.licenseType,
    seats: str(camper.capacity.seats),
    sleeps: str(camper.capacity.sleeps),
    lengthMm: str(camper.specifications.lengthMm),
    widthMm: str(camper.specifications.widthMm),
    heightMm: str(camper.specifications.heightMm),
    weightKg: str(camper.specifications.weightKg),
    fuelType: camper.specifications.fuelType,
    transmission: camper.specifications.transmission,
    engine: camper.specifications.engine ?? '',
    mileageKm: str(camper.specifications.mileageKm),
    region: camper.location.region,
    city: camper.location.city ?? '',
    address: camper.location.address ?? '',
    pickupNotes: camper.location.pickupNotes ?? '',
    dailyRate: str(camper.pricing.dailyRate),
    weekendDailyRate: str(camper.pricing.weekendDailyRate),
    cleaningFee: str(camper.pricing.cleaningFee),
    securityDeposit: str(camper.pricing.securityDeposit),
    extras: camper.extras.map((extra) => ({
      _id: extra._id,
      name: extra.name,
      price: str(extra.price),
      chargeType: extra.chargeType,
      maxQuantity: str(extra.maxQuantity),
    })),
    minNights: str(camper.minNights),
    maxNights: str(camper.maxNights),
    status: camper.status,
    isFeatured: camper.isFeatured,
  }
}

const num = (value: string) => (value.trim() === '' ? undefined : Number(value))
/** Create: omit empty optional text. Edit: send "" so a cleared field is actually cleared. */
const optional = (value: string, editing: boolean) => (value.trim() === '' ? (editing ? '' : undefined) : value.trim())

export function formToCamperInput(values: CamperFormValues, editing: boolean): CamperInput {
  return {
    name: values.name.trim(),
    category: values.category,
    features: values.features,
    description: values.description.trim(),
    highlights: values.highlights.map((h) => ({ title: h.title.trim(), description: h.description.trim() })),
    brand: optional(values.brand, editing),
    company: optional(values.company, editing),
    baseVehicle: optional(values.baseVehicle, editing),
    modelYear: num(values.modelYear),
    licenseType: values.licenseType,
    capacity: { seats: Number(values.seats), sleeps: Number(values.sleeps) },
    specifications: {
      lengthMm: num(values.lengthMm),
      widthMm: num(values.widthMm),
      heightMm: num(values.heightMm),
      weightKg: num(values.weightKg),
      fuelType: values.fuelType,
      transmission: values.transmission,
      engine: optional(values.engine, editing),
      mileageKm: num(values.mileageKm),
    },
    location: {
      region: values.region.trim(),
      city: optional(values.city, editing),
      address: optional(values.address, editing),
      pickupNotes: optional(values.pickupNotes, editing),
    },
    pricing: {
      dailyRate: Number(values.dailyRate),
      weekendDailyRate: num(values.weekendDailyRate),
      cleaningFee: num(values.cleaningFee) ?? 0,
      securityDeposit: num(values.securityDeposit) ?? 0,
    },
    extras: values.extras.map((extra) => ({
      ...(extra._id ? { _id: extra._id } : {}),
      name: extra.name.trim(),
      price: Number(extra.price),
      chargeType: extra.chargeType,
      maxQuantity: Number(extra.maxQuantity),
    })),
    minNights: Number(values.minNights),
    maxNights: Number(values.maxNights),
    status: values.status,
    isFeatured: values.isFeatured,
  }
}
