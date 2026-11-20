import { Request, Response } from "express";
import { accessCookieOptions, COOKIE_NAMES, refreshCookieOptions } from "../config/cookies";
import { AuthAudience } from "../constants/enums";
import { HttpCode } from "../constants/http";
import { currentMember } from "../middleware/auth.middleware";
import { getValidated } from "../middleware/validate.middleware";
import { authService, AuthTokens } from "../services/Auth.service";
import { memberService } from "../services/Member.service";
import { clientMeta } from "../utils/request";
import { sendSuccess } from "../utils/response";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

/*
 * Tokens travel only in HTTP-only cookies and are never put in the JSON body,
 * so page scripts (and any XSS) cannot read them.
 */
const setAuthCookies = (res: Response, audience: AuthAudience, tokens: AuthTokens): void => {
  const names = COOKIE_NAMES[audience];
  res.cookie(names.access, tokens.accessToken, accessCookieOptions());
  res.cookie(names.refresh, tokens.refreshToken, refreshCookieOptions(audience));
};

const clearAuthCookies = (res: Response, audience: AuthAudience): void => {
  const names = COOKIE_NAMES[audience];
  const { maxAge: _accessMaxAge, ...accessOptions } = accessCookieOptions();
  const { maxAge: _refreshMaxAge, ...refreshOptions } = refreshCookieOptions(audience);
  res.clearCookie(names.access, accessOptions);
  res.clearCookie(names.refresh, refreshOptions);
};

const readRefreshCookie = (req: Request, audience: AuthAudience): string | undefined => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[COOKIE_NAMES[audience].refresh];
  return typeof value === "string" && value ? value : undefined;
};

/** Login/logout/refresh/me/password handlers shared by the customer site and the admin dashboard. */
const createSessionHandlers = (audience: AuthAudience) => ({
  login: async (req: Request, res: Response) => {
    const input = getValidated(req, "body", loginSchema);
    const { member, tokens } = await authService.login(input, audience, clientMeta(req));
    setAuthCookies(res, audience, tokens);
    sendSuccess(res, { message: "Logged in successfully", data: { member } });
  },

  refresh: async (req: Request, res: Response) => {
    try {
      const tokens = await authService.refresh(readRefreshCookie(req, audience) ?? "", audience, clientMeta(req));
      setAuthCookies(res, audience, tokens);
      sendSuccess(res, { message: "Session refreshed" });
    } catch (error) {
      clearAuthCookies(res, audience);
      throw error;
    }
  },

  logout: async (req: Request, res: Response) => {
    await authService.logout(readRefreshCookie(req, audience), audience);
    clearAuthCookies(res, audience);
    sendSuccess(res, { message: "Logged out successfully" });
  },

  me: async (req: Request, res: Response) => {
    const member = await memberService.getById(currentMember(req)._id);
    sendSuccess(res, { message: "Profile retrieved", data: { member } });
  },

  changePassword: async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = getValidated(req, "body", changePasswordSchema);
    const tokens = await authService.changePassword(currentMember(req)._id, currentPassword, newPassword, audience, clientMeta(req));
    setAuthCookies(res, audience, tokens);
    sendSuccess(res, { message: "Password changed successfully" });
  },
});

export const customerAuthController = {
  ...createSessionHandlers(AuthAudience.CUSTOMER),

  register: async (req: Request, res: Response) => {
    const input = getValidated(req, "body", registerSchema);
    const { member, tokens } = await authService.register(input, clientMeta(req));
    setAuthCookies(res, AuthAudience.CUSTOMER, tokens);
    sendSuccess(res, { statusCode: HttpCode.CREATED, message: "Account created successfully", data: { member } });
  },

  forgotPassword: async (req: Request, res: Response) => {
    const { email } = getValidated(req, "body", forgotPasswordSchema);
    await authService.forgotPassword(email);
    sendSuccess(res, { message: "If an account exists for this email, a reset link has been sent" });
  },

  resetPassword: async (req: Request, res: Response) => {
    const { token, password } = getValidated(req, "body", resetPasswordSchema);
    await authService.resetPassword(token, password);
    sendSuccess(res, { message: "Password has been reset. Please log in." });
  },
};

export const adminAuthController = createSessionHandlers(AuthAudience.ADMIN);
