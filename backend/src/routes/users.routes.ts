import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Static /me routes must be registered before the dynamic /:username route below.
router.get('/me', authenticate, usersController.getOwnProfile);
router.put('/me', authenticate, usersController.updateOwnProfile);
router.get('/me/bookmarks', authenticate, usersController.getMyBookmarks);
router.get('/me/submissions', authenticate, usersController.getMySubmissions);
router.get('/:username', usersController.getPublicProfile);

export default router;
