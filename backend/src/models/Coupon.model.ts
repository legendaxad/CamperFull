import { model, Schema } from "mongoose";
import { DiscountType } from "../constants/enums";
import { Coupon } from "../interfaces/booking.interface";
import { baseSchemaOptions } from "./shared.schemas";

const couponSchema = new Schema<Coupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 300 },
    discountType: { type: String, enum: Object.values(DiscountType), required: true },
    discountValue: { type: Number, required: true, min: 1 },
    maxDiscountAmount: { type: Number, min: 1 },
    minBookingAmount: { type: Number, default: 0, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

couponSchema.path("discountValue").validate(function (this: Coupon, value: number) {
  return this.discountType !== DiscountType.PERCENTAGE || value <= 100;
}, "A percentage discount cannot exceed 100");

export const CouponModel = model<Coupon>("Coupon", couponSchema);
