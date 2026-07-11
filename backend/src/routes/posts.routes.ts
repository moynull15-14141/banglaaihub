import { Router } from 'express';
import * as postsController from '../controllers/posts.controller';
import { authenticate, authenticateOptional } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { postImageUpload } from '../middleware/upload';
import { createRateLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { createPostSchema, listPostsQuerySchema, updatePostSchema } from '../validators/post.validator';
import { createReportSchema } from '../validators/resource.validator';

const router = Router();

// No approval queue (unlike resource submissions) — this cap is the actual
// spam control, same reasoning as auth.routes.ts's registerLimiter.
const createPostLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 });
// Same 20/day/user cap as resource/comment reports (doc 13's rate-limiting table).
const reportLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 20 });

router.get('/', authenticateOptional, validate(listPostsQuerySchema, 'query'), postsController.list);
router.post(
  '/',
  authenticate,
  createPostLimiter,
  postImageUpload.single('file'),
  validate(createPostSchema),
  postsController.create,
);
router.patch('/:id', authenticate, validate(updatePostSchema), postsController.update);
router.delete('/:id', authenticate, postsController.remove);
router.post('/:id/like', authenticate, authorize('like:create'), postsController.toggleLike);
router.post(
  '/:id/report',
  authenticate,
  authorize('resource:report'),
  reportLimiter,
  validate(createReportSchema),
  postsController.report,
);

export default router;
