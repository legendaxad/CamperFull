import { model, Schema } from "mongoose";
import { ReviewStatus } from "../constants/enums";
import { Review } from "../interfaces/engagement.interface";
import { baseSchemaOptions } from "./shared.schemas";

const reviewSchema = new Schema<Review>(
  {
    // One review per completed booking; this is what makes reviews "verified".
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    camper: { type: Schema.Types.ObjectId, ref: "Camper", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
    status: { type: String, enum: Object.values(ReviewStatus), default: ReviewStatus.PUBLISHED },
    adminReply: { type: String, trim: true, maxlength: 2000 },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  baseSchemaOptions,
);

reviewSchema.index({ camper: 1, status: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

export const ReviewModel = model<Review>("Review", reviewSchema);
