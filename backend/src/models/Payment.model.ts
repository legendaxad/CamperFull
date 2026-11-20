import { model, Schema } from "mongoose";
import { PaymentProviderName, PaymentStatus } from "../constants/enums";
import { Payment, Refund } from "../interfaces/booking.interface";
import { baseSchemaOptions } from "./shared.schemas";

const refundSchema = new Schema<Refund>({
  amount: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true, maxlength: 500 },
  transactionKey: { type: String },
  processedBy: { type: Schema.Types.ObjectId, ref: "Member" },
  refundedAt: { type: Date, required: true },
});

/*
 * A payment attempt for a booking. Card data never reaches this server: the
 * provider's checkout collects it, and we only store the provider's
 * transaction id, method label and receipt link.
 */
const paymentSchema = new Schema<Payment>(
  {
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    provider: { type: String, enum: Object.values(PaymentProviderName), required: true },
    orderId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "KRW" },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    transactionId: { type: String },
    method: { type: String, maxlength: 60 },
    receiptUrl: { type: String },
    paidAt: { type: Date },
    failureReason: { type: String, maxlength: 500 },
    refundedAmount: { type: Number, default: 0, min: 0 },
    refunds: { type: [refundSchema], default: [] },
  },
  baseSchemaOptions,
);

paymentSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $type: "string" } } },
);
paymentSchema.index({ status: 1, paidAt: -1 });
paymentSchema.index({ createdAt: -1 });

export const PaymentModel = model<Payment>("Payment", paymentSchema);
