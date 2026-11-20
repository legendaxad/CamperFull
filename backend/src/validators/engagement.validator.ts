import { z } from "zod";
import { InquiryStatus, NotificationType, ReviewStatus } from "../constants/enums";
import { emailSchema, objectIdSchema, paginationSchema, phoneSchema, queryBoolean, searchSchema } from "./common.validator";

/* Reviews */
const ratingSchema = z.number().int().min(1).max(5);
const commentSchema = z.string().trim().min(3).max(2000);

export const reviewCreateSchema = z.object({ bookingId: objectIdSchema, rating: ratingSchema, comment: commentSchema }).strict();

export const reviewUpdateSchema = z
  .object({ rating: ratingSchema.optional(), comment: commentSchema.optional() })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const reviewListQuerySchema = paginationSchema.extend({
  sort: z.enum(["newest", "highest", "lowest"]).default("newest"),
});

export const adminReviewListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(ReviewStatus).optional(),
  camperId: objectIdSchema.optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: searchSchema,
});

export const reviewModerationSchema = z
  .object({
    status: z.nativeEnum(ReviewStatus).optional(),
    adminReply: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide status or adminReply");

export const camperIdParamSchema = z.object({ camperId: objectIdSchema });

/* Notifications */
export const notificationListQuerySchema = paginationSchema.extend({ unread: queryBoolean.optional() });

export const adminSendNotificationSchema = z
  .object({
    recipientId: objectIdSchema,
    title: z.string().trim().min(1).max(150),
    message: z.string().trim().min(1).max(1000),
    type: z.nativeEnum(NotificationType).default(NotificationType.SYSTEM),
  })
  .strict();

/* Contact inquiries */
export const inquiryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: emailSchema,
    phone: phoneSchema.optional(),
    subject: z.string().trim().min(1).max(200),
    message: z.string().trim().min(5).max(5000),
    camperId: objectIdSchema.optional(),
  })
  .strict();

export const adminInquiryListQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(InquiryStatus).optional(),
  search: searchSchema,
});

export const inquiryUpdateSchema = z
  .object({
    status: z.nativeEnum(InquiryStatus).optional(),
    adminReply: z.string().trim().max(5000).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide status or adminReply");

/* Settings */
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

export const settingsUpdateSchema = z
  .object({
    businessName: z.string().trim().min(1).max(120).optional(),
    contactEmail: emailSchema.optional(),
    contactPhone: phoneSchema.optional(),
    address: z.string().trim().max(300).optional(),
    bookingHoldMinutes: z.number().int().min(5).max(1440).optional(),
    freeCancellationDays: z.number().int().min(0).max(60).optional(),
    minLeadDays: z.number().int().min(0).max(60).optional(),
    maxAdvanceDays: z.number().int().min(1).max(730).optional(),
    pickupTime: timeSchema.optional(),
    returnTime: timeSchema.optional(),
    weekendNights: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one setting to update");

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;
export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;
export type InquiryCreateInput = z.infer<typeof inquiryCreateSchema>;
