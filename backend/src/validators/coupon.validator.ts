import { z } from "zod";
import { DiscountType } from "../constants/enums";
import { moneySchema, paginationSchema, patchSchema, queryBoolean, searchSchema } from "./common.validator";

const couponBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,40}$/, "Code must be 3-40 letters, numbers, - or _"),
  description: z.string().trim().max(300).optional(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().int().min(1),
  maxDiscountAmount: moneySchema.min(1).optional(),
  minBookingAmount: moneySchema.default(0),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  usageLimit: z.number().int().min(1).optional(),
  perCustomerLimit: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
});

const percentageWithinRange = (data: { discountType?: DiscountType; discountValue?: number }) =>
  data.discountType !== DiscountType.PERCENTAGE || data.discountValue === undefined || data.discountValue <= 100;

const datesInOrder = (data: { startsAt?: Date; expiresAt?: Date }) =>
  !data.startsAt || !data.expiresAt || data.expiresAt.getTime() > data.startsAt.getTime();

export const couponCreateSchema = couponBaseSchema
  .strict()
  .refine(percentageWithinRange, { path: ["discountValue"], message: "A percentage discount cannot exceed 100" })
  .refine(datesInOrder, { path: ["expiresAt"], message: "expiresAt must be after startsAt" });

export const couponUpdateSchema = patchSchema(couponBaseSchema)
  .refine(percentageWithinRange, { path: ["discountValue"], message: "A percentage discount cannot exceed 100" })
  .refine(datesInOrder, { path: ["expiresAt"], message: "expiresAt must be after startsAt" });

export const couponListQuerySchema = paginationSchema.extend({
  search: searchSchema,
  active: queryBoolean.optional(),
});

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>;
export type CouponListQuery = z.infer<typeof couponListQuerySchema>;
