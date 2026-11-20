import { model, Schema } from "mongoose";
import { Category } from "../interfaces/catalog.interface";
import { baseSchemaOptions, imageSchema } from "./shared.schemas";

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: { type: imageSchema },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export const CategoryModel = model<Category>("Category", categorySchema);
