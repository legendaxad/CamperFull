import jwt, { JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from "../config/cookies";
import { env } from "../config/env";
import { AuthAudience, MemberRole } from "../constants/enums";
import { Message } from "../constants/messages";
import { AppError } from "./AppError";

const ISSUER = "fullcamper";

export interface AccessTokenClaims {
  sub: string;
  role: MemberRole;
  aud: AuthAudience;
  ver: number;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
  aud: AuthAudience;
}

export const signAccessToken = (
  memberId: string,
  role: MemberRole,
  tokenVersion: number,
  audience: AuthAudience,
): string =>
  jwt.sign({ role, ver: tokenVersion }, env.JWT_SECRET, {
    subject: memberId,
    audience,
    issuer: ISSUER,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    algorithm: "HS256",
  });

export const signRefreshToken = (memberId: string, sessionId: string, audience: AuthAudience): string =>
  jwt.sign({ sid: sessionId }, env.REFRESH_TOKEN_SECRET, {
    subject: memberId,
    audience,
    issuer: ISSUER,
    expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
    algorithm: "HS256",
  });

const verify = (token: string, secret: string, audience: AuthAudience): JwtPayload => {
  try {
    const payload = jwt.verify(token, secret, { audience, issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload === "string") throw new Error("Unexpected token payload");
    return payload;
  } catch {
    throw AppError.unauthorized(Message.INVALID_TOKEN);
  }
};

export const verifyAccessToken = (token: string, audience: AuthAudience): AccessTokenClaims => {
  const payload = verify(token, env.JWT_SECRET, audience);
  if (!payload.sub || typeof payload.role !== "string" || typeof payload.ver !== "number") {
    throw AppError.unauthorized(Message.INVALID_TOKEN);
  }
  return { sub: payload.sub, role: payload.role as MemberRole, aud: audience, ver: payload.ver };
};

export const verifyRefreshToken = (token: string, audience: AuthAudience): RefreshTokenClaims => {
  const payload = verify(token, env.REFRESH_TOKEN_SECRET, audience);
  if (!payload.sub || typeof payload.sid !== "string") throw AppError.unauthorized(Message.INVALID_TOKEN);
  return { sub: payload.sub, sid: payload.sid, aud: audience };
};
