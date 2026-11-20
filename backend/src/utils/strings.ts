import crypto from "node:crypto";

/** Escapes user input before it is used inside a RegExp, preventing ReDoS and regex injection. */
export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Case-insensitive "contains" matcher for simple search boxes. */
export const containsRegex = (value: string): RegExp => new RegExp(escapeRegex(value.trim()), "i");

/** URL-friendly slug. Non-Latin names (e.g. Korean) keep their characters. */
export const slugify = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString("hex");

/** Tokens (refresh, password reset) are stored hashed so a database leak cannot be replayed. */
export const sha256 = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

export const randomCode = (length: number): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid misreading
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};
