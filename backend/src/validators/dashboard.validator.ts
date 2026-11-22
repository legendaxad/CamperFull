import { z } from "zod";
import { csvList, dateOnlySchema, paginationSchema } from "./common.validator";

/** Ten years: enough for yearly reports, small enough to keep zero-filled series bounded. */
const MAX_RANGE_DAYS = 3660;
const DAY_MS = 24 * 60 * 60 * 1000;

export const dashboardRangeQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    interval: z.enum(["day", "week", "month", "year"]).default("day"),
    limit: z.coerce.number().int().min(1).max(50).default(5),
  })
  .refine((data) => !data.from || !data.to || data.to.getTime() > data.from.getTime(), {
    path: ["to"],
    message: "to must be after from",
  })
  .refine((data) => !data.from || !data.to || (data.to.getTime() - data.from.getTime()) / DAY_MS <= MAX_RANGE_DAYS, {
    path: ["from"],
    message: `The date range cannot exceed ${MAX_RANGE_DAYS} days`,
  });

/** Events the activity feed derives from existing records (there is no separate audit-log collection). */
export const ACTIVITY_TYPES = ["BOOKING_STATUS", "PAYMENT_CAPTURED", "PAYMENT_FAILED", "REFUND", "CUSTOMER_REGISTERED"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const activityQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: csvList(z.enum(ACTIVITY_TYPES)).optional(),
});

export type DashboardRangeQuery = z.infer<typeof dashboardRangeQuerySchema>;
export type ActivityQuery = z.infer<typeof activityQuerySchema>;
