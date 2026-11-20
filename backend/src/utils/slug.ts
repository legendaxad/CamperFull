import { Model, Types } from "mongoose";
import { randomCode, slugify } from "./strings";

/** Builds a slug from `name` that is unique within the collection ("caravan", "caravan-2", ...). */
export const uniqueSlug = async <T>(model: Model<T>, name: string, excludeId?: Types.ObjectId | string): Promise<string> => {
  const base = slugify(name) || randomCode(8).toLowerCase();
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const exists = await model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!exists) return candidate;
  }
  return `${base}-${randomCode(6).toLowerCase()}`;
};

/** Lets public endpoints accept either an ObjectId or a slug. */
export const idOrSlugFilter = (value: string): { _id: string } | { slug: string } =>
  /^[a-f\d]{24}$/i.test(value) ? { _id: value } : { slug: value.toLowerCase() };
