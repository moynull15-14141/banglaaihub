import { Router } from 'express';
import * as seoController from '../controllers/seo.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { duplicateCheckQuerySchema } from '../validators/seo.validator';

// Mounted at /seo (Phase 5A-2 SEO Engine) — editor-tier (content:edit), same
// gating as the Articles admin nav entry itself, not admin-only: this
// measures the content editors themselves author.
const seoRouter = Router();

seoRouter.get(
  '/duplicate-check',
  authenticate,
  authorize('content:edit'),
  validate(duplicateCheckQuerySchema, 'query'),
  seoController.checkDuplicate,
);

seoRouter.get('/dashboard', authenticate, authorize('content:edit'), seoController.getDashboard);

export default seoRouter;
