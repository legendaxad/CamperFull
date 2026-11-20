import { z } from "zod";
import { MemberRole, MemberStatus } from "../constants/enums";
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "./common.validator";

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string().optional(),
  })
  .strict()
  .refine((data) => data.confirmPassword === undefined || data.confirmPassword === data.password, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current password",
  });

export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export const createAdminSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema.optional(),
    password: passwordSchema,
    role: z.enum([MemberRole.ADMIN, MemberRole.SUPER_ADMIN]).default(MemberRole.ADMIN),
  })
  .strict();

export const updateAdminSchema = z
  .object({
    role: z.enum([MemberRole.ADMIN, MemberRole.SUPER_ADMIN]).optional(),
    status: z.enum([MemberStatus.ACTIVE, MemberStatus.BLOCKED]).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, "Provide at least one field to update");

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
