import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v), { message: 'Password must include a letter' })
  .refine((v) => /\d/.test(v), { message: 'Password must include a number' })
