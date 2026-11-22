import { z } from 'zod'
import { normalizePhone } from '@/features/auth/authSchemas'

/** Mirrors backend/src/validators/booking.validator.ts (bookingCreateSchema.driver / customerNote / couponCode). */
export const driverSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the driver’s full name').max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => /^\+?\d{8,15}$/.test(normalizePhone(v)), 'Enter a valid phone number'),
  licenseNumber: z.string().trim().max(40, 'Licence number is too long'),
  customerNote: z.string().trim().max(1000, 'Notes can be at most 1000 characters'),
})
export type DriverValues = z.infer<typeof driverSchema>

export const couponSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === '' || (v.length >= 3 && v.length <= 40), 'Coupon codes are 3–40 characters')

export const cancelReasonSchema = z.string().trim().max(500, 'Reason can be at most 500 characters')
