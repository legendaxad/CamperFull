import { z } from "zod";
import {
  CamperStatus,
  ExtraChargeType,
  FuelType,
  LicenseType,
  Transmission,
} from "../constants/enums";
import {
  csvList,
  dateOnlySchema,
  moneySchema,
  objectIdSchema,
  paginationSchema,
  patchSchema,
  queryBoolean,
  searchSchema,
} from "./common.validator";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

/* ---------------- Categories & features ---------------- */

export const categoryCreateSchema = z
  .object({
    name: text(80),
    description: optionalText(1000),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })
  .strict();

export const categoryUpdateSchema = patchSchema(categoryCreateSchema);

export const featureCreateSchema = z
  .object({
    name: text(80),
    group: optionalText(60),
    icon: optionalText(60),
    isActive: z.boolean().default(true),
  })
  .strict();

export const featureUpdateSchema = patchSchema(featureCreateSchema);

export const idOrSlugParamSchema = z.object({ idOrSlug: z.string().trim().min(1).max(160) });

/* ---------------- Campers ---------------- */

const extraSchema = z.object({
  _id: objectIdSchema.optional(),
  name: text(80),
  price: moneySchema,
  chargeType: z.nativeEnum(ExtraChargeType),
  maxQuantity: z.number().int().min(1).max(20).default(1),
});

const camperBaseSchema = z.object({
  name: text(120),
  category: objectIdSchema,
  features: z.array(objectIdSchema).max(50).default([]),
  description: text(5000),
  highlights: z.array(z.object({ title: text(120), description: text(2000) })).max(10).default([]),
  brand: optionalText(80),
  company: optionalText(120),
  baseVehicle: optionalText(120),
  modelYear: z.number().int().min(1950).max(2100).optional(),
  licenseType: z.nativeEnum(LicenseType),
  capacity: z.object({
    seats: z.number().int().min(1).max(20),
    sleeps: z.number().int().min(0).max(20),
  }),
  specifications: z
    .object({
      lengthMm: z.number().int().min(0).optional(),
      widthMm: z.number().int().min(0).optional(),
      heightMm: z.number().int().min(0).optional(),
      weightKg: z.number().int().min(0).optional(),
      fuelType: z.nativeEnum(FuelType).default(FuelType.DIESEL),
      transmission: z.nativeEnum(Transmission).default(Transmission.AUTOMATIC),
      engine: optionalText(120),
      mileageKm: z.number().int().min(0).optional(),
    })
    // prefault: an omitted object is parsed as {}, so the nested defaults apply.
    .prefault({}),
  location: z.object({
    region: text(80),
    city: optionalText(80),
    address: optionalText(300),
    pickupNotes: optionalText(1000),
  }),
  pricing: z.object({
    dailyRate: moneySchema.refine((value) => value > 0, "Daily rate must be greater than 0"),
    weekendDailyRate: moneySchema.optional(),
    cleaningFee: moneySchema.default(0),
    securityDeposit: moneySchema.default(0),
  }),
  extras: z.array(extraSchema).max(30).default([]),
  minNights: z.number().int().min(1).max(365).default(1),
  maxNights: z.number().int().min(1).max(365).default(30),
  status: z.nativeEnum(CamperStatus).default(CamperStatus.AVAILABLE),
  isFeatured: z.boolean().default(false),
});

const nightsAreConsistent = (data: { minNights?: number; maxNights?: number }) =>
  data.minNights === undefined || data.maxNights === undefined || data.minNights <= data.maxNights;

export const camperCreateSchema = camperBaseSchema
  .strict()
  .refine(nightsAreConsistent, { path: ["maxNights"], message: "maxNights must be greater than or equal to minNights" });

/** Updates replace whole nested objects (pricing, capacity...) to keep each one internally consistent. */
export const camperUpdateSchema = patchSchema(camperBaseSchema)
  .refine(nightsAreConsistent, { path: ["maxNights"], message: "maxNights must be greater than or equal to minNights" })
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

const camperSortSchema = z.enum(["newest", "price_asc", "price_desc", "rating", "popular"]).default("newest");

/** Mirrors the frontend filter sidebar: cost range, brand, company, licence, location, travellers. */
const camperFilterSchema = paginationSchema.extend({
  search: searchSchema,
  category: z.string().trim().min(1).max(160).optional(),
  brand: csvList(z.string().max(80)).optional(),
  company: csvList(z.string().max(120)).optional(),
  region: csvList(z.string().max(80)).optional(),
  licenseType: csvList(z.nativeEnum(LicenseType)).optional(),
  features: csvList(objectIdSchema).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minSeats: z.coerce.number().int().min(1).max(20).optional(),
  minSleeps: z.coerce.number().int().min(0).max(20).optional(),
  featured: queryBoolean.optional(),
  startDate: dateOnlySchema.optional(),
  endDate: dateOnlySchema.optional(),
  sort: camperSortSchema,
});

const dateRangeIsValid = (data: { startDate?: Date; endDate?: Date }) =>
  (data.startDate === undefined) === (data.endDate === undefined) &&
  (!data.startDate || !data.endDate || data.endDate.getTime() > data.startDate.getTime());

export const camperListQuerySchema = camperFilterSchema.refine(dateRangeIsValid, {
  path: ["endDate"],
  message: "Provide both startDate and endDate, with endDate after startDate",
});

export const adminCamperListQuerySchema = camperFilterSchema
  .extend({ status: csvList(z.nativeEnum(CamperStatus)).optional() })
  .refine(dateRangeIsValid, { path: ["endDate"], message: "Provide both startDate and endDate, with endDate after startDate" });

export const camperCompareQuerySchema = z.object({
  ids: z.preprocess((value) => (typeof value === "string" ? value.split(",").map((id) => id.trim()) : value), z.array(objectIdSchema).min(2).max(4)),
});

export const availabilityQuerySchema = z
  .object({ from: dateOnlySchema, to: dateOnlySchema })
  .refine((data) => data.to.getTime() > data.from.getTime(), { path: ["to"], message: "to must be after from" })
  .refine((data) => data.to.getTime() - data.from.getTime() <= 400 * 24 * 60 * 60 * 1000, {
    path: ["to"],
    message: "Range cannot exceed 400 days",
  });

export const camperStatusSchema = z.object({ status: z.nativeEnum(CamperStatus) });

export const imageParamsSchema = z.object({ id: objectIdSchema, imageId: objectIdSchema });

export const reorderImagesSchema = z.object({ imageIds: z.array(objectIdSchema).min(1).max(50) });

/* ---------------- Camping places ---------------- */

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Expected HH:MM");

export const campingPlaceCreateSchema = z
  .object({
    name: text(150),
    city: optionalText(120),
    region: text(80),
    description: optionalText(5000),
    facilities: z.array(text(80)).max(40).default([]),
    coordinates: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).optional(),
    phone: optionalText(30),
    workingHours: z.object({ from: timeSchema, to: timeSchema }).optional(),
    homepage: optionalText(300),
    isActive: z.boolean().default(true),
  })
  .strict();

export const campingPlaceUpdateSchema = patchSchema(campingPlaceCreateSchema);

export const campingPlaceListQuerySchema = paginationSchema.extend({
  search: searchSchema,
  region: z.string().trim().max(80).optional(),
});

export type CamperCreateInput = z.infer<typeof camperCreateSchema>;
export type CamperUpdateInput = z.infer<typeof camperUpdateSchema>;
export type CamperListQuery = z.infer<typeof adminCamperListQuerySchema>;
