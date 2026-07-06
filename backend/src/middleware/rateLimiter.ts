import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse';

export function createRateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: false,
    legacyHeaders: true,
    handler: (_req, res) => {
      sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.');
    },
  });
}

// Baseline global limiter — doc 13's "All other GET" default (300 req/min per IP).
// Route-specific limiters (login, register, submit, etc.) are applied where those
// routes are implemented, using the same factory.
export const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 300 });
