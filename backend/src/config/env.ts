import dotenv from "dotenv";
import { z } from "zod";

/*
 * Environment configuration is validated once at startup so a misconfigured
 * deployment fails fast with a readable message instead of failing later
 * inside a request.
 *
 * The test runner never loads `.env`: tests must not be able to reach a real
 * database or payment provider by accident.
 */
if (process.env.NODE_ENV !== "test") {
  dotenv.config({ quiet: true });
}

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    // MONGO_URL is accepted for compatibility with the previous backend's .env.
    MONGODB_URI: optionalString,
    MONGO_URL: optionalString,

    JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
    JWT_EXPIRES_IN: z.string().default("15m"),
    REFRESH_TOKEN_SECRET: z.string().min(1, "REFRESH_TOKEN_SECRET is required"),
    REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    CLIENT_URL: z.string().url().default("http://localhost:3000"),
    ADMIN_URL: z.string().url().default("http://localhost:5173"),
    CORS_EXTRA_ORIGINS: optionalString,

    COOKIE_DOMAIN: optionalString,
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_SECURE: booleanString.optional(),

    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce
      .number()
      .int()
      .positive()
      .default(15),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
    CLOUDINARY_FOLDER: z.string().default("fullcamper"),

    PAYMENT_PROVIDER: z.enum(["toss", "mock"]).default("mock"),
    TOSS_SECRET_KEY: optionalString,
    TOSS_API_BASE_URL: z.string().url().default("https://api.tosspayments.com"),

    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    MAIL_FROM: z.string().default("FullCamper <no-reply@fullcamper.local>"),
  })
  .superRefine((env, ctx) => {
    if (!env.MONGODB_URI && !env.MONGO_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: "MONGODB_URI is required",
      });
    }
    if (env.COOKIE_SAME_SITE === "none" && env.COOKIE_SECURE === false) {
      // Browsers silently drop SameSite=None cookies that are not Secure.
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_SAME_SITE"],
        message: "SameSite=none requires secure cookies",
      });
    }
    if (env.NODE_ENV !== "production") return;

    // Production-only guards: weak secrets, fake payments and insecure cookies
    // are acceptable during development but never in a live deployment.
    for (const key of ["JWT_SECRET", "REFRESH_TOKEN_SECRET"] as const) {
      if (env[key].length < 32) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} must be at least 32 characters in production`,
        });
      }
    }
    if (env.JWT_SECRET === env.REFRESH_TOKEN_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["REFRESH_TOKEN_SECRET"],
        message: "Access and refresh secrets must differ",
      });
    }
    if (env.PAYMENT_PROVIDER === "mock") {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_PROVIDER"],
        message: "The mock payment provider is not allowed in production",
      });
    }
    if (env.PAYMENT_PROVIDER === "toss" && !env.TOSS_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["TOSS_SECRET_KEY"],
        message: "TOSS_SECRET_KEY is required for the toss provider",
      });
    }
    if (env.COOKIE_SECURE === false) {
      ctx.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "Cookies must be secure in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // The logger depends on this module, so plain stderr is used here.
  process.stderr.write(`Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  MONGODB_URI: (raw.MONGODB_URI ?? raw.MONGO_URL) as string,
  COOKIE_SECURE: raw.COOKIE_SECURE ?? raw.NODE_ENV === "production",
  corsOrigins: [
    raw.CLIENT_URL,
    raw.ADMIN_URL,
    ...(raw.CORS_EXTRA_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []),
  ].map((origin) => origin.replace(/\/$/, "")),
  isCloudinaryConfigured: Boolean(
    raw.CLOUDINARY_CLOUD_NAME &&
    raw.CLOUDINARY_API_KEY &&
    raw.CLOUDINARY_API_SECRET,
  ),
  isMailConfigured: Boolean(raw.SMTP_HOST),
} as const;

export type Env = typeof env;
