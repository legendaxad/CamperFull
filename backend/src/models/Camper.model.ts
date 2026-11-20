import { model, Schema } from "mongoose";
import {
  CamperStatus,
  ExtraChargeType,
  FuelType,
  LicenseType,
  Transmission,
} from "../constants/enums";
import { Camper, CamperExtra, CamperHighlight } from "../interfaces/catalog.interface";
import { baseSchemaOptions, imageSchema } from "./shared.schemas";

const wholeNumber = { validator: Number.isInteger, message: "{PATH} must be a whole number" };

const extraSchema = new Schema<CamperExtra>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 0, validate: wholeNumber },
  chargeType: { type: String, enum: Object.values(ExtraChargeType), required: true },
  maxQuantity: { type: Number, default: 1, min: 1, max: 20 },
});

const highlightSchema = new Schema<CamperHighlight>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const camperSchema = new Schema<Camper>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    features: [{ type: Schema.Types.ObjectId, ref: "Feature" }],
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    highlights: { type: [highlightSchema], default: [] },
    brand: { type: String, trim: true, maxlength: 80 },
    company: { type: String, trim: true, maxlength: 120 },
    baseVehicle: { type: String, trim: true, maxlength: 120 },
    modelYear: { type: Number, min: 1950, max: 2100 },
    licenseType: { type: String, enum: Object.values(LicenseType), required: true },
    capacity: {
      seats: { type: Number, required: true, min: 1, max: 20 },
      sleeps: { type: Number, required: true, min: 0, max: 20 },
    },
    specifications: {
      lengthMm: { type: Number, min: 0 },
      widthMm: { type: Number, min: 0 },
      heightMm: { type: Number, min: 0 },
      weightKg: { type: Number, min: 0 },
      fuelType: { type: String, enum: Object.values(FuelType), default: FuelType.DIESEL },
      transmission: { type: String, enum: Object.values(Transmission), default: Transmission.AUTOMATIC },
      engine: { type: String, trim: true, maxlength: 120 },
      mileageKm: { type: Number, min: 0 },
    },
    location: {
      region: { type: String, required: true, trim: true, maxlength: 80 },
      city: { type: String, trim: true, maxlength: 80 },
      address: { type: String, trim: true, maxlength: 300 },
      pickupNotes: { type: String, trim: true, maxlength: 1000 },
    },
    pricing: {
      dailyRate: { type: Number, required: true, min: 0, validate: wholeNumber },
      weekendDailyRate: { type: Number, min: 0, validate: wholeNumber },
      cleaningFee: { type: Number, default: 0, min: 0, validate: wholeNumber },
      securityDeposit: { type: Number, default: 0, min: 0, validate: wholeNumber },
    },
    extras: { type: [extraSchema], default: [] },
    minNights: { type: Number, default: 1, min: 1 },
    maxNights: { type: Number, default: 30, min: 1 },
    images: { type: [imageSchema], default: [] },
    status: { type: String, enum: Object.values(CamperStatus), default: CamperStatus.AVAILABLE },
    isFeatured: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0, min: 0 },
    bookingLockVersion: { type: Number, default: 0, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  baseSchemaOptions,
);

// Supports the public catalog's most common filter + sort combinations.
camperSchema.index({ status: 1, category: 1, "pricing.dailyRate": 1 });
camperSchema.index({ status: 1, isFeatured: 1, ratingAverage: -1 });
camperSchema.index({ status: 1, "location.region": 1 });
camperSchema.index({ status: 1, createdAt: -1 });
camperSchema.index({ features: 1 });

export const CamperModel = model<Camper>("Camper", camperSchema);
