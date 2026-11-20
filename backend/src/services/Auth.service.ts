import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { REFRESH_TOKEN_TTL_MS } from "../config/cookies";
import { env } from "../config/env";
import { ADMIN_ROLES, AuthAudience, MemberRole, MemberStatus } from "../constants/enums";
import { HttpCode } from "../constants/http";
import { Message } from "../constants/messages";
import { Member } from "../interfaces/member.interface";
import { MemberModel, SessionModel } from "../models";
import { AppError } from "../utils/AppError";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { logger } from "../utils/logger";
import { randomToken, sha256 } from "../utils/strings";
import { LoginInput, RegisterInput } from "../validators/auth.validator";
import { mailService } from "./Mail.service";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  member: Member;
  tokens: AuthTokens;
}

// Used when the email is unknown so a failed login takes the same time
// either way and cannot be used to discover registered emails.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

class AuthService {
  private readonly memberModel = MemberModel;
  private readonly sessionModel = SessionModel;

  public hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  /** Public sign-up always creates a CUSTOMER; admins are created only by a super admin. */
  public async register(input: RegisterInput, meta: ClientMeta): Promise<AuthResult> {
    await this.assertUniqueContact(input.email, input.phone);

    const created = await this.memberModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash: await this.hashPassword(input.password),
      role: MemberRole.CUSTOMER,
    });

    const member = created.toJSON() as Member;
    const tokens = await this.issueTokens(member, AuthAudience.CUSTOMER, meta);
    return { member, tokens };
  }

  public async login(input: LoginInput, audience: AuthAudience, meta: ClientMeta): Promise<AuthResult> {
    const found = await this.memberModel.findOne({ email: input.email }).select("+passwordHash").exec();
    const passwordMatches = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!found || !passwordMatches || found.status === MemberStatus.DELETED) {
      throw AppError.unauthorized(Message.INVALID_CREDENTIALS);
    }
    if (found.status === MemberStatus.BLOCKED) throw AppError.forbidden(Message.ACCOUNT_BLOCKED);

    const isAdmin = ADMIN_ROLES.includes(found.role);
    if (audience === AuthAudience.ADMIN && !isAdmin) throw AppError.unauthorized(Message.INVALID_CREDENTIALS);
    if (audience === AuthAudience.CUSTOMER && isAdmin) {
      throw AppError.forbidden("Administrator accounts must sign in through the admin dashboard");
    }

    found.lastLoginAt = new Date();
    await found.save();

    const member = found.toJSON() as Member;
    const tokens = await this.issueTokens(member, audience, meta);
    return { member, tokens };
  }

  /**
   * Refresh-token rotation: each refresh token works once. If an already-used
   * token shows up again it was probably stolen, so every session of that
   * member is revoked and they must log in again.
   */
  public async refresh(refreshToken: string, audience: AuthAudience, meta: ClientMeta): Promise<AuthTokens> {
    const claims = verifyRefreshToken(refreshToken, audience);
    if (!Types.ObjectId.isValid(claims.sid)) throw AppError.unauthorized(Message.INVALID_TOKEN);

    const session = await this.sessionModel.findById(claims.sid).exec();
    if (!session || session.audience !== audience || session.member.toString() !== claims.sub) {
      throw AppError.unauthorized(Message.INVALID_TOKEN);
    }
    if (session.revokedAt) {
      logger.warn({ memberId: claims.sub }, "Refresh token reuse detected; revoking all sessions");
      await this.revokeAllSessions(session.member.toString());
      throw AppError.unauthorized(Message.INVALID_TOKEN);
    }
    if (session.tokenHash !== sha256(refreshToken) || session.expiresAt.getTime() <= Date.now()) {
      throw AppError.unauthorized(Message.INVALID_TOKEN);
    }

    const member = await this.memberModel.findById(session.member).lean<Member>().exec();
    if (!member || member.status !== MemberStatus.ACTIVE) throw AppError.unauthorized();

    // Only one concurrent refresh can win the rotation of a given session.
    const rotated = await this.sessionModel
      .updateOne({ _id: session._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } })
      .exec();
    if (rotated.modifiedCount === 0) throw AppError.unauthorized(Message.INVALID_TOKEN);

    return this.issueTokens(member, audience, meta);
  }

  public async logout(refreshToken: string | undefined, audience: AuthAudience): Promise<void> {
    if (!refreshToken) return;
    try {
      const claims = verifyRefreshToken(refreshToken, audience);
      if (!Types.ObjectId.isValid(claims.sid)) return;
      await this.sessionModel.updateOne({ _id: claims.sid, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } }).exec();
    } catch {
      // An invalid token at logout is harmless: the cookies are cleared anyway.
    }
  }

  public async changePassword(
    memberId: Types.ObjectId,
    currentPassword: string,
    newPassword: string,
    audience: AuthAudience,
    meta: ClientMeta,
  ): Promise<AuthTokens> {
    const member = await this.memberModel.findById(memberId).select("+passwordHash").exec();
    if (!member) throw AppError.unauthorized();

    const matches = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!matches) throw AppError.badRequest("Current password is incorrect", [{ field: "currentPassword", message: "Incorrect password" }]);

    await this.setPassword(member._id, newPassword);
    // The current device gets fresh tokens; all other devices are signed out.
    return this.issueTokens(member.toJSON() as Member, audience, meta);
  }

  /** Always resolves the same way so the endpoint does not reveal which emails exist. */
  public async forgotPassword(email: string): Promise<void> {
    const member = await this.memberModel
      .findOne({ email, role: MemberRole.CUSTOMER, status: MemberStatus.ACTIVE })
      .exec();
    if (!member) return;

    const token = randomToken(32);
    member.passwordResetTokenHash = sha256(token);
    member.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await member.save();

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await mailService.send({
      to: member.email,
      subject: "Reset your FullCamper password",
      text: `Hello ${member.firstName},\n\nUse the link below to reset your password. It expires in 30 minutes.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    });
  }

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const member = await this.memberModel
      .findOne({
        passwordResetTokenHash: sha256(token),
        passwordResetExpiresAt: { $gt: new Date() },
        status: MemberStatus.ACTIVE,
      })
      .exec();
    if (!member) throw AppError.badRequest(Message.INVALID_TOKEN);

    await this.setPassword(member._id, newPassword);
  }

  /** Signs the member out everywhere: refresh sessions are revoked and access tokens stop working. */
  public async revokeAllSessions(memberId: string | Types.ObjectId): Promise<void> {
    await this.memberModel.updateOne({ _id: memberId }, { $inc: { tokenVersion: 1 } }).exec();
    await this.sessionModel
      .updateMany({ member: memberId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } })
      .exec();
  }

  public async assertUniqueContact(email: string, phone?: string, excludeId?: Types.ObjectId): Promise<void> {
    const conditions: Record<string, string>[] = [{ email }];
    if (phone) conditions.push({ phone });
    const existing = await this.memberModel
      .findOne({ $or: conditions, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
      .select("email phone")
      .lean()
      .exec();
    if (!existing) return;
    if (existing.email === email) throw new AppError(HttpCode.CONFLICT, Message.EMAIL_IN_USE, [{ field: "email", message: Message.EMAIL_IN_USE }]);
    throw new AppError(HttpCode.CONFLICT, Message.PHONE_IN_USE, [{ field: "phone", message: Message.PHONE_IN_USE }]);
  }

  /** Sets a new password, clears reset tokens and invalidates every existing session and access token. */
  private async setPassword(memberId: Types.ObjectId, newPassword: string): Promise<void> {
    await this.memberModel
      .updateOne(
        { _id: memberId },
        {
          $set: { passwordHash: await this.hashPassword(newPassword), passwordChangedAt: new Date() },
          $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
          $inc: { tokenVersion: 1 },
        },
      )
      .exec();
    await this.revokeAllSessions(memberId);
  }

  private async issueTokens(member: Pick<Member, "_id" | "role">, audience: AuthAudience, meta: ClientMeta): Promise<AuthTokens> {
    const memberId = member._id.toString();
    // Read the current version so tokens issued after a revocation are valid.
    const current = await this.memberModel.findById(member._id).select("+tokenVersion").lean().exec();
    const sessionId = new Types.ObjectId();
    const refreshToken = signRefreshToken(memberId, sessionId.toString(), audience);

    await this.sessionModel.create({
      _id: sessionId,
      member: member._id,
      audience,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent: meta.userAgent?.slice(0, 300),
      ip: meta.ip,
    });

    return { accessToken: signAccessToken(memberId, member.role, current?.tokenVersion ?? 0, audience), refreshToken };
  }
}

export const authService = new AuthService();
