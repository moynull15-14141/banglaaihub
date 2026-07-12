import { Router } from 'express';
import * as controller from '../controllers/siteFonts.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { fontUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { fontSlotParamSchema, uploadFontFileQuerySchema, upsertFontSchema } from '../validators/siteFonts.validator';

// Site Font Engine. GET /site-settings/fonts is public/unauthenticated — the
// frontend's root layout fetches it on every request to render the active
// typography, so it must never require a session. Every mutating route is
// gated behind system:configure (super_admin only), same tier as the
// Meilisearch rebuild-index endpoint — this is sitewide infrastructure, not
// routine content moderation.
const router = Router();

router.get('/', controller.getActiveFonts);
router.get('/catalog', authenticate, authorize('system:configure'), controller.getCatalog);

router.put(
  '/:slot',
  authenticate,
  authorize('system:configure'),
  validate(fontSlotParamSchema, 'params'),
  validate(upsertFontSchema),
  controller.upsertFont,
);

router.post(
  '/:slot/upload',
  authenticate,
  authorize('system:configure'),
  validate(fontSlotParamSchema, 'params'),
  fontUpload.single('file'),
  validate(uploadFontFileQuerySchema, 'query'),
  controller.uploadFontFile,
);

router.delete(
  '/:slot',
  authenticate,
  authorize('system:configure'),
  validate(fontSlotParamSchema, 'params'),
  controller.resetFont,
);

export default router;
