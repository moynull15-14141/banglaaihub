import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';
import { avatarUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  addBookmarkSchema,
  listSubmissionsQuerySchema,
  updateProfileSchema,
} from '../validators/user.validator';

const router = Router();

// Static /me routes must be registered before the dynamic /:username route below.
router.get('/me', authenticate, usersController.getOwnProfile);
router.put('/me', authenticate, validate(updateProfileSchema), usersController.updateOwnProfile);
router.post('/me/avatar', authenticate, avatarUpload.single('file'), usersController.uploadAvatar);
router.get('/me/dashboard', authenticate, usersController.getDashboard);
router.get('/me/bookmarks', authenticate, usersController.getMyBookmarks);
router.post(
  '/me/bookmarks',
  authenticate,
  validate(addBookmarkSchema),
  usersController.addMyBookmark,
);
router.delete('/me/bookmarks/:resourceId', authenticate, usersController.removeMyBookmark);
router.get(
  '/me/submissions',
  authenticate,
  validate(listSubmissionsQuerySchema, 'query'),
  usersController.getMySubmissions,
);
router.get('/:username/reputation', usersController.getReputation);
router.get('/:username', usersController.getPublicProfile);

export default router;
