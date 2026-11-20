import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { HttpCode } from "../constants/http";
import { Message } from "../constants/messages";
import { AppError } from "../utils/AppError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence for cookie authentication. Browsers always send an Origin
 * header on cross-site state-changing requests, so rejecting unknown origins
 * blocks forged form posts. Requests without an Origin (server-to-server
 * calls such as payment webhooks) carry no browser cookies and are allowed.
 */
export const verifyOrigin = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !env.corsOrigins.includes(origin.replace(/\/$/, ""))) {
    return next(AppError.forbidden(Message.ORIGIN_NOT_ALLOWED));
  }
  next();
};

const rateLimitHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(HttpCode.TOO_MANY_REQUESTS, Message.TOO_MANY_REQUESTS));
};

/** Strict limiter for credential endpoints (login, register, password reset). */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** General limiter for the whole API, generous enough for normal browsing. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.API_RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});
