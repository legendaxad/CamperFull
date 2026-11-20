import { z } from "zod";
import { BookingStatus } from "../constants/enums";
import { csvList, dateOnlySchema, objectIdSchema, paginationSchema, phoneSchema, searchSchema } from "./common.validator";

const extrasSchema = z
  .array(z.object({ extraId: objectIdSchema, quantity: z.number().int().min(1).max(20).default(1) }))
  .max(30)
  .default([]);

const stayFields = {
  camperId: objectIdSchema,
  startDate: dateOnlySchema,
  endDate: dateOnlySchema,
  extras: extrasSchema,
  couponCode: z.string().trim().toUpperCase().min(3).max(40).optional(),
};

const endAfterStart = (data: { startDate: Date; endDate: Date }) => data.endDate.getTime() > data.startDate.getTime();
const endAfterStartIssue = { path: ["endDate"], message: "endDate (return day) must be after startDate (pickup day)" };

export const bookingQuoteSchema = z.object(stayFields).strict().refine(endAfterStart, endAfterStartIssue);

export const bookingCreateSchema = z
  .object({
    ...stayFields,
    driver: z.object({
      fullName: z.string().trim().min(2).max(120),
      phone: phoneSchema,
      licenseNumber: z.string().trim().max(40).optional(),
    }),
    customerNote: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(endAfterStart, endAfterStartIssue);

export const customerBookingListQuerySchema = paginationSchema.extend({
  status: csvList(z.nativeEnum(BookingStatus)).optional(),
  scope: z.enum(["all", "upcoming", "past"]).default("all"),
});

export const adminBookingListQuerySchema = paginationSchema.extend({
  status: csvList(z.nativeEnum(BookingStatus)).optional(),
  search: searchSchema,
  camperId: objectIdSchema.optional(),
  customerId: objectIdSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  sort: z.enum(["newest", "oldest", "start_asc", "start_desc", "total_desc"]).default("newest"),
});

export const cancelBookingSchema = z.object({ reason: z.string().trim().max(500).optional() }).strict();

export const adminBookingStatusSchema = z
  .object({
    status: z.nativeEnum(BookingStatus),
    reason: z.string().trim().max(500).optional(),
    /** When cancelling a paid booking: refund the full amount through the payment provider. */
    refund: z.boolean().default(false),
  })
  .strict();

export const adminBookingNoteSchema = z.object({ adminNote: z.string().trim().max(2000) }).strict();

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type CustomerBookingListQuery = z.infer<typeof customerBookingListQuerySchema>;
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;
