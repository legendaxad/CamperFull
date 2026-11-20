import { model, Schema } from "mongoose";
import { BookingStatus, ExtraChargeType, PaymentStatus } from "../constants/enums";
import { BookedExtra, Booking, PriceBreakdown, StatusHistoryEntry } from "../interfaces/booking.interface";
import { baseSchemaOptions } from "./shared.schemas";

const bookedExtraSchema = new Schema<BookedExtra>(
  {
    extraId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    chargeType: { type: String, enum: Object.values(ExtraChargeType), required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const priceSchema = new Schema<PriceBreakdown>(
  {
    currency: { type: String, required: true },
    nights: { type: Number, required: true, min: 1 },
    weekdayNights: { type: Number, required: true, min: 0 },
    weekendNights: { type: Number, required: true, min: 0 },
    dailyRate: { type: Number, required: true, min: 0 },
    weekendDailyRate: { type: Number, required: true, min: 0 },
    rentalSubtotal: { type: Number, required: true, min: 0 },
    cleaningFee: { type: Number, required: true, min: 0 },
    extras: { type: [bookedExtraSchema], default: [] },
    extrasTotal: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    couponCode: { type: String },
    total: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    status: { type: String, enum: Object.values(BookingStatus), required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "Member" },
    reason: { type: String, maxlength: 500 },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const bookingSchema = new Schema<Booking>(
  {
    bookingNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    camper: { type: Schema.Types.ObjectId, ref: "Camper", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(BookingStatus), default: BookingStatus.PENDING },
    price: { type: priceSchema, required: true },
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING },
    holdExpiresAt: { type: Date },
    driver: {
      fullName: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, required: true, trim: true, maxlength: 30 },
      licenseNumber: { type: String, trim: true, maxlength: 40 },
    },
    customerNote: { type: String, trim: true, maxlength: 1000 },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    statusHistory: { type: [statusHistorySchema], default: [] },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 500 },
  },
  baseSchemaOptions,
);

bookingSchema.path("endDate").validate(function (this: Booking, endDate: Date) {
  return endDate.getTime() > this.startDate.getTime();
}, "endDate must be after startDate");

// The availability query: "bookings of camper X in these statuses that touch this date range".
bookingSchema.index({ camper: 1, status: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ status: 1, startDate: 1 });
bookingSchema.index({ status: 1, holdExpiresAt: 1 });
bookingSchema.index({ createdAt: -1 });

export const BookingModel = model<Booking>("Booking", bookingSchema);
