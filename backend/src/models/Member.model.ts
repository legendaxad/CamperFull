import { model, Schema } from "mongoose";
import { MemberRole, MemberStatus } from "../constants/enums";
import { Member, Session } from "../interfaces/member.interface";
import { baseSchemaOptions, imageSchema } from "./shared.schemas";

/*
 * One Member collection for customers and administrators, distinguished by
 * `role`. Auth, profile and status logic is shared; admin-only access is
 * enforced by role checks and by separate admin tokens.
 */
const memberSchema = new Schema<Member>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(MemberRole), default: MemberRole.CUSTOMER, index: true },
    status: { type: String, enum: Object.values(MemberStatus), default: MemberStatus.ACTIVE, index: true },
    avatar: { type: imageSchema },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    tokenVersion: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "Member" },
  },
  {
    ...baseSchemaOptions,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.tokenVersion;
        return ret;
      },
    },
  },
);

memberSchema.index({ email: 1 }, { unique: true });
// Phone is optional, so uniqueness applies only to members that have one.
memberSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });
memberSchema.index({ role: 1, createdAt: -1 });

export const MemberModel = model<Member>("Member", memberSchema);

const sessionSchema = new Schema<Session>(
  {
    member: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    audience: { type: String, required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String, maxlength: 300 },
    ip: { type: String },
  },
  baseSchemaOptions,
);

// MongoDB removes expired refresh sessions on its own.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<Session>("Session", sessionSchema);
