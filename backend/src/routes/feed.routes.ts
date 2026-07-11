import { Router } from 'express';
import * as feedController from '../controllers/feed.controller';
import { authenticate, authenticateOptional } from '../middleware/authenticate';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { getFeedQuerySchema, recordImpressionsSchema } from '../validators/feed.validator';

const router = Router();

// No file-specific line in doc 13's rate-limiting table — dedicated instance
// of the doc's "All other GET" default (300/min/IP), same values as
// rateLimiter.ts's generalLimiter, kept as its own instance so this file
// still has a defined ceiling if the app-wide blanket limiter ever changes.
router.use(createRateLimiter({ windowMs: 60 * 1000, max: 300 }));

// Optional auth: guests get the same non-personalized newest/trending feed
// as logged-in users in Phase 1 (personalization arrives in Phase 2, at
// which point req.user starts mattering here).
router.get('/', authenticateOptional, validate(getFeedQuerySchema, 'query'), feedController.getFeed);

// Phase 4C, Stage 1 — closes the previously-dormant seen-penalty loop (see
// scoring/affinity.ts's getSeenPenalties). Auth required: impressions are
// per-user state, unlike the feed read itself.
router.post(
  '/impressions',
  authenticate,
  validate(recordImpressionsSchema),
  feedController.recordImpressions,
);

export default router;
