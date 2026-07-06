import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.validator';

const router = Router();

// Rate limits transcribed exactly from doc 13's "Rate Limiting" table.
const loginLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });
const forgotPasswordLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });
const refreshLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
