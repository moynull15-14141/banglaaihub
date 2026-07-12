import { Router } from 'express';
import * as controller from '../controllers/statCardImages.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { statCardImageUpload } from '../middleware/upload';

// Homepage stat-card hero images. GET / is public/unauthenticated — the
// homepage fetches it on every load. Every mutating route is gated behind
// system:configure (super_admin only), same tier as the Site Font Engine —
// this is sitewide infrastructure, not routine content moderation.
const router = Router();

router.get('/', controller.getAll);

router.post(
  '/:slot',
  authenticate,
  authorize('system:configure'),
  statCardImageUpload.single('file'),
  controller.upsertImage,
);

router.delete('/:slot', authenticate, authorize('system:configure'), controller.resetImage);

export default router;
