import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { updateCommentSchema } from '../validators/comment.validator';
import { createReportSchema } from '../validators/resource.validator';

const router = Router();

// Same 20/day/user cap as resource reports (doc 13's rate-limiting table).
const reportLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 20 });

// Ownership (own vs. comment:delete_any) is resolved inline in
// CommentService, same pattern as PUT /resources/:slug.
router.put('/:id', authenticate, validate(updateCommentSchema), commentsController.update);
router.delete('/:id', authenticate, commentsController.remove);
router.post('/:id/upvote', authenticate, authorize('like:create'), commentsController.upvote);
router.post(
  '/:id/report',
  authenticate,
  authorize('resource:report'),
  reportLimiter,
  validate(createReportSchema),
  commentsController.report,
);

export default router;
