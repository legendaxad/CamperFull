import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { parseDateOnly } from "../utils/dates";

export const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value), "Invalid id");

export const idParamSchema = z.object({ id: objectIdSchema });

/** Calendar date "YYYY-MM-DD" -> UTC-midnight Date (see utils/dates.ts for the convention). */
export const dateOnlySchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const date = parseDateOnly(value);
    if (!date) {
      // Fatal: stops parsing so cross-field checks (end after start) never see a non-Date value.
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected a valid date in YYYY-MM-DD format", fatal: true });
      return z.NEVER;
    }
    return date;
  });

/** Bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password is too long")
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Password must contain a letter and a number");

export const emailSchema = z.string().trim().toLowerCase().email("Invalid email address").max(254);

/** Accepts "010-1234-5678", "+82 10 1234 5678", ... and stores digits only (with optional leading +). */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-().]/g, ""))
  .refine((value) => /^\+?\d{8,15}$/.test(value), "Invalid phone number");

export const nameSchema = z.string().trim().min(1).max(60);

export const moneySchema = z.coerce.number().int("Amount must be a whole number").min(0);

const booleanFromQuery = z.enum(["true", "false"]).transform((value) => value === "true");
export const queryBoolean = z.union([z.boolean(), booleanFromQuery]);

const splitList = (value: unknown): unknown => {
  const parts = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : value;
  return Array.isArray(parts) ? parts.map((entry) => (typeof entry === "string" ? entry.trim() : entry)).filter((entry) => entry !== "") : parts;
};

/** "a,b,c" or repeated params -> validated array */
export const csvList = <T extends z.ZodType>(item: T) => z.preprocess(splitList, z.array(item).max(50));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export const searchSchema = z.string().trim().min(1).max(100).optional();

export const imageInputSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  alt: z.string().trim().max(200).optional(),
});

type WithoutDefault<T> = T extends z.ZodDefault<infer Inner> ? Inner : T extends z.ZodPrefault<infer Inner> ? Inner : T;

/**
 * Builds a PATCH schema from a create schema: every field becomes optional
 * and loses its default. Zod 4 applies defaults even inside `.partial()`, so
 * without this a partial update (e.g. renaming a camper) would silently
 * reset omitted fields such as status, features or isActive.
 */
export const patchSchema = <S extends z.ZodRawShape>(schema: z.ZodObject<S>) => {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      const inner = field instanceof z.ZodDefault || field instanceof z.ZodPrefault ? field.unwrap() : field;
      return [key, (inner as z.ZodType).optional()];
    }),
  );
  return z.object(shape).strict() as unknown as z.ZodObject<{ [K in keyof S]: z.ZodOptional<WithoutDefault<S[K]>> }>;
};
