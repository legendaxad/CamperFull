import { z } from "zod";
import { PaymentStatus } from "../constants/enums";
import { csvList, dateOnlySchema, moneySchema, objectIdSchema, paginationSchema, searchSchema } from "./common.validator";

export const checkoutSchema = z.object({ bookingId: objectIdSchema }).strict();

/** Sent by the frontend after the provider redirects back (Toss: paymentKey, orderId, amount). */
export const paymentConfirmSchema = z
  .object({
    transactionId: z.string().trim().min(1).max(200),
    orderId: z.string().trim().min(6).max(64),
    amount: moneySchema,
  })
  .strict();

/** Toss webhook body. Only the identifiers are used; the state is fetched from Toss. */
export const tossWebhookSchema = z.object({
  eventType: z.string().optional(),
  data: z.object({
    paymentKey: z.string().min(1).max(200),
    orderId: z.string().min(1).max(64),
  }),
});

export const refundSchema = z
  .object({
    amount: moneySchema.min(1).optional(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const paymentListQuerySchema = paginationSchema;

export const adminPaymentListQuerySchema = paginationSchema.extend({
  status: csvList(z.nativeEnum(PaymentStatus)).optional(),
  bookingId: objectIdSchema.optional(),
  customerId: objectIdSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  search: searchSchema,
});
