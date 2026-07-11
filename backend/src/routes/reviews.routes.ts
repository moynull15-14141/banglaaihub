import { Router } from 'express';
import * as reviewsController from '../controllers/reviews.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { updateReviewSchema } from '../validators/review.validator';
import { createReportSchema } from '../validators/resource.validator';

// Mounted at /reviews — standalone, ownership (own vs. moderator delete_any)
// resolved inline in ReviewService, same pattern as PUT /resources/:slug.
const reviewsRouter = Router();

// Same 20/day/user cap as resource reports (doc 13's rate-limiting table).
const reportLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 20 });

reviewsRouter.put('/:id', authenticate, validate(updateReviewSchema), reviewsController.update);
reviewsRouter.delete('/:id', authenticate, reviewsController.remove);
reviewsRouter.post(
  '/:id/helpful',
  authenticate,
  authorize('review:helpful'),
  reviewsController.markHelpful,
);
reviewsRouter.delete('/:id/helpful', authenticate, reviewsController.unmarkHelpful);
reviewsRouter.post(
  '/:id/report',
  authenticate,
  authorize('resource:report'),
  reportLimiter,
  validate(createReportSchema),
  reviewsController.report,
);

export default reviewsRouter;
