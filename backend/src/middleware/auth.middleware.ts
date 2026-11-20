import { NextFunction, Request, Response } from "express";
import { COOKIE_NAMES } from "../config/cookies";
import { ADMIN_ROLES, AuthAudience, MemberRole, MemberStatus } from "../constants/enums";
import { Message } from "../constants/messages";
import { MemberModel } from "../models";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

/**
 * Browsers authenticate with the HTTP-only cookie. A Bearer header is also
 * accepted for API tools and future mobile clients.
 */
const extractAccessToken = (req: Request, audience: AuthAudience): string | undefined => {
  const header = req.headers.authorization;
  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (match) return match[1];
  }
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const cookie = cookies?.[COOKIE_NAMES[audience].access];
  return typeof cookie === "string" && cookie ? cookie : undefined;
};

const resolveMember = async (req: Request, audience: AuthAudience): Promise<void> => {
  const token = extractAccessToken(req, audience);
  if (!token) throw AppError.unauthorized();

  const claims = verifyAccessToken(token, audience);
  const member = await MemberModel.findById(claims.sub)
    .select("role status email firstName lastName +tokenVersion")
    .lean()
    .exec();

  // The database is checked on every request so blocking a member or changing
  // a password takes effect immediately, not when the token expires.
  if (!member || member.status !== MemberStatus.ACTIVE) throw AppError.unauthorized();
  if ((member.tokenVersion ?? 0) !== claims.ver) throw AppError.unauthorized(Message.INVALID_TOKEN);

  const isAdmin = ADMIN_ROLES.includes(member.role);
  if (audience === AuthAudience.ADMIN && !isAdmin) throw AppError.forbidden();
  if (audience === AuthAudience.CUSTOMER && isAdmin) throw AppError.forbidden();

  req.member = {
    _id: member._id,
    role: member.role,
    email: member.email,
    firstName: member.firstName,
    lastName: member.lastName,
    audience,
  };
};

/** Requires a valid customer session. */
export const requireCustomer = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  await resolveMember(req, AuthAudience.CUSTOMER);
  next();
};

/** Requires a valid admin-dashboard session (ADMIN or SUPER_ADMIN). */
export const requireAdmin = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  await resolveMember(req, AuthAudience.ADMIN);
  next();
};

/** Attaches the customer if a valid session exists, but never rejects the request. */
export const optionalCustomer = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    await resolveMember(req, AuthAudience.CUSTOMER);
  } catch {
    req.member = undefined;
  }
  next();
};

/** Restricts an already-authenticated route to specific roles. */
export const allowRoles =
  (...roles: MemberRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.member || !roles.includes(req.member.role)) return next(AppError.forbidden());
    next();
  };

/** For controllers behind an auth middleware: returns the member or fails loudly. */
export const currentMember = (req: Request) => {
  if (!req.member) throw AppError.unauthorized();
  return req.member;
};
