import { MemberRole, MemberStatus } from "../constants/enums";
import { Image, ObjectId, Timestamps } from "./common.interface";

export interface Member extends Timestamps {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: MemberRole;
  status: MemberStatus;
  avatar?: Image;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  /** Embedded in access tokens; incrementing it instantly invalidates every issued token. */
  tokenVersion: number;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdBy?: ObjectId;
}

/** What is safe to send to a client. */
export type PublicMember = Omit<Member, "passwordHash" | "passwordResetTokenHash" | "passwordResetExpiresAt">;

export interface Session extends Timestamps {
  _id: ObjectId;
  member: ObjectId;
  audience: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  userAgent?: string;
  ip?: string;
}
