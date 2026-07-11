import { Router } from 'express';
import * as feedController from '../controllers/feed.controller';
import { authenticate, authenticateOptional } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { getFeedQuerySchema, recordImpressionsSchema } from '../validators/feed.validator';

const router = Router();

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
