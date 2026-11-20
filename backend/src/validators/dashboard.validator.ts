import { z } from "zod";
import { dateOnlySchema } from "./common.validator";

export const dashboardRangeQuerySchema = z
  .object({
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
    interval: z.enum(["day", "week", "month"]).default("day"),
    limit: z.coerce.number().int().min(1).max(50).default(5),
  })
  .refine((data) => !data.from || !data.to || data.to.getTime() > data.from.getTime(), {
    path: ["to"],
    message: "to must be after from",
  });

export type DashboardRangeQuery = z.infer<typeof dashboardRangeQuerySchema>;
