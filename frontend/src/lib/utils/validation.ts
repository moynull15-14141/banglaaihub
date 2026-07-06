import { z } from 'zod';

// Mirrors backend/src/validators/auth.validator.ts exactly — do not diverge from
// these rules without updating the backend validator to match.
export const emailSchema = z.string().email();

export const usernameSchema = z
  .string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character.');
