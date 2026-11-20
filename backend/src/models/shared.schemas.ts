import { Schema } from "mongoose";
import { Image } from "../interfaces/common.interface";

export const imageSchema = new Schema<Image>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: true },
);

/** Shared options: timestamps everywhere and no `__v` noise in API responses. */
export const baseSchemaOptions = { timestamps: true, versionKey: false } as const;
