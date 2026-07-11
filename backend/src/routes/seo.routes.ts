import { Router } from 'express';
import * as seoController from '../controllers/seo.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { duplicateCheckQuerySchema } from '../validators/seo.validator';

// Mounted at /seo (Phase 5A-2 SEO Engine) — editor-tier (content:edit), same
// gating as the Articles admin nav entry itself, not admin-only: this
// measures the content editors themselves author.
const seoRouter = Router();

// No file-specific line in doc 13's rate-limiting table — dedicated instance
// of the doc's "All other GET" default (300/min/IP), same values as
// rateLimiter.ts's generalLimiter, kept as its own instance so this file
// still has a defined ceiling if the app-wide blanket limiter ever changes.
seoRouter.use(createRateLimiter({ windowMs: 60 * 1000, max: 300 }));

seoRouter.get(
  '/duplicate-check',
  authenticate,
  authorize('content:edit'),
  validate(duplicateCheckQuerySchema, 'query'),
  seoController.checkDuplicate,
);

seoRouter.get('/dashboard', authenticate, authorize('content:edit'), seoController.getDashboard);

export default seoRouter;
