import { z } from 'zod'

/*
 * Client-side rules mirror backend/src/validators/auth.validator.ts and common.validator.ts
 * so customers see problems before submitting; the server remains the authority and its
 * field errors are shown on the same inputs.
 */

const name = (label: string) => z.string().trim().min(1, `Enter your ${label}`).max(60, `${label} is too long`)

/** Same normalization as the backend: spaces, dashes, dots and brackets are ignored. */
export const normalizePhone = (value: string) => value.replace(/[\s\-().]/g, '')
const phoneRule = (v: string) => /^\+?\d{8,15}$/.test(normalizePhone(v))

export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters')
  .refine((v) => new TextEncoder().encode(v).length <= 72, 'Password is too long')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Include at least one letter and one number')

export const signInSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(200),
})
export type SignInValues = z.infer<typeof signInSchema>

export const registerSchema = z
  .object({
    firstName: name('first name'),
    lastName: name('last name'),
    email: z.email('Enter a valid email address').max(254),
    phone: z.string().trim().refine((v) => v === '' || phoneRule(v), 'Enter a valid phone number'),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export type RegisterValues = z.infer<typeof registerSchema>

export const profileSchema = z.object({
  firstName: name('first name'),
  lastName: name('last name'),
  phone: z.string().trim().refine((v) => v === '' || phoneRule(v), 'Enter a valid phone number'),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.currentPassword !== v.newPassword, { path: ['newPassword'], message: 'Choose a different password' })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const forgotPasswordSchema = z.object({ email: z.email('Enter a valid email address') })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({ password: passwordRule, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
