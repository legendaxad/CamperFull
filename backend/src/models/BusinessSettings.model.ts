import { model, Schema } from "mongoose";
import { BusinessSettings } from "../interfaces/engagement.interface";
import { baseSchemaOptions } from "./shared.schemas";

/** A single settings document (key = "business") editable from the admin dashboard. */
const businessSettingsSchema = new Schema<BusinessSettings>(
  {
    key: { type: String, required: true, unique: true, default: "business" },
    businessName: { type: String, required: true, default: "FullCamper", maxlength: 120 },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true, maxlength: 300 },
    currency: { type: String, default: "KRW" },
    bookingHoldMinutes: { type: Number, default: 30, min: 5, max: 1440 },
    freeCancellationDays: { type: Number, default: 3, min: 0, max: 60 },
    minLeadDays: { type: Number, default: 1, min: 0, max: 60 },
    maxAdvanceDays: { type: Number, default: 365, min: 1, max: 730 },
    pickupTime: { type: String, default: "15:00", match: /^\d{2}:\d{2}$/ },
    returnTime: { type: String, default: "11:00", match: /^\d{2}:\d{2}$/ },
    weekendNights: { type: [Number], default: [5, 6] },
  },
  baseSchemaOptions,
);

export const BusinessSettingsModel = model<BusinessSettings>("BusinessSettings", businessSettingsSchema);
