import { model, Schema } from "mongoose";
import { Feature } from "../interfaces/catalog.interface";
import { baseSchemaOptions } from "./shared.schemas";

/** Reusable amenities (heating, solar panel, shower...) shared across campers and used as filters. */
const featureSchema = new Schema<Feature>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    group: { type: String, trim: true, maxlength: 60 },
    icon: { type: String, trim: true, maxlength: 60 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

export const FeatureModel = model<Feature>("Feature", featureSchema);
