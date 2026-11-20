import { model, Schema } from "mongoose";
import { CampingPlace } from "../interfaces/catalog.interface";
import { baseSchemaOptions, imageSchema } from "./shared.schemas";

/** Recommended camping sites shown on the frontend's Camping pages and Kakao map. */
const campingPlaceSchema = new Schema<CampingPlace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    city: { type: String, trim: true, maxlength: 120 },
    region: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 5000 },
    facilities: { type: [String], default: [] },
    coordinates: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    phone: { type: String, trim: true, maxlength: 30 },
    workingHours: {
      from: { type: String, match: /^\d{2}:\d{2}$/ },
      to: { type: String, match: /^\d{2}:\d{2}$/ },
    },
    homepage: { type: String, trim: true, maxlength: 300 },
    images: { type: [imageSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

campingPlaceSchema.index({ isActive: 1, region: 1 });

export const CampingPlaceModel = model<CampingPlace>("CampingPlace", campingPlaceSchema);
