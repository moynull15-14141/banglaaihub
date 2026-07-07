import { Router } from 'express';
import * as contributorApplicationController from '../controllers/contributor-application.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createRateLimiter } from '../middleware/rateLimiter';
import { contributorSampleUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  addSampleFileQuerySchema,
  submitContributorApplicationSchema,
  updateContributorApplicationSchema,
} from '../validators/contributor-application.validator';

// Mounted at /contributor-applications
const router = Router();

// Meant to be rare, not routine — stricter than the 10/hour resource-submit
// limit (doc 13's rate-limiting table).
const submitLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 });

router.post(
  '/',
  authenticate,
  authorize('contributor_application:submit'),
  submitLimiter,
  validate(submitContributorApplicationSchema),
  contributorApplicationController.submit,
);
router.get(
  '/me',
  authenticate,
  authorize('contributor_application:view_own'),
  contributorApplicationController.getMine,
);
router.patch(
  '/me',
  authenticate,
  authorize('contributor_application:submit'),
  validate(updateContributorApplicationSchema),
  contributorApplicationController.updateMine,
);
router.post(
  '/me/withdraw',
  authenticate,
  authorize('contributor_application:withdraw'),
  contributorApplicationController.withdrawMine,
);
router.post(
  '/me/samples',
  authenticate,
  authorize('contributor_application:submit'),
  contributorSampleUpload.single('file'),
  validate(addSampleFileQuerySchema, 'query'),
  contributorApplicationController.addSampleFile,
);

export default router;
