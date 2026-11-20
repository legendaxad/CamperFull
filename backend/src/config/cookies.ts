import { CookieOptions } from "express";
import { AuthAudience } from "../constants/enums";
import { parseDurationMs } from "../utils/duration";
import { env } from "./env";

/*
 * The customer site and the admin dashboard get separate cookie names, so
 * logging into one app never replaces or exposes the other app's session.
 */
export const COOKIE_NAMES = {
  [AuthAudience.CUSTOMER]: { access: "fc_access", refresh: "fc_refresh" },
  [AuthAudience.ADMIN]: { access: "fc_admin_access", refresh: "fc_admin_refresh" },
} as const;

export const ACCESS_TOKEN_TTL_MS = parseDurationMs(env.JWT_EXPIRES_IN);
export const REFRESH_TOKEN_TTL_MS = parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN);

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
});

export const accessCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions(),
  path: "/",
  maxAge: ACCESS_TOKEN_TTL_MS,
});

/** The refresh cookie is only sent to the auth endpoints that need it. */
export const refreshCookieOptions = (audience: AuthAudience): CookieOptions => ({
  ...baseCookieOptions(),
  path: audience === AuthAudience.ADMIN ? "/api/v1/admin/auth" : "/api/v1/auth",
  maxAge: REFRESH_TOKEN_TTL_MS,
});
