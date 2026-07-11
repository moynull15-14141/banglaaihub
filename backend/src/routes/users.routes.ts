import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate, authenticateOptional } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { avatarUpload, coverUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  addBookmarkSchema,
  heatmapQuerySchema,
  listActivityQuerySchema,
  listSubmissionsQuerySchema,
  pinResourceSchema,
  reorderPinnedResourcesSchema,
  searchUsersQuerySchema,
  updateNotificationPreferenceSchema,
  updateProfileSchema,
} from '../validators/user.validator';

const router = Router();

// Static /me and /search routes must be registered before the dynamic
// /:username route below (and before /:username/* sub-routes), same
// ordering constraint noted in the original file.
router.get('/me', authenticate, usersController.getOwnProfile);
router.put('/me', authenticate, validate(updateProfileSchema), usersController.updateOwnProfile);
router.patch(
  '/me/notification-preferences',
  authenticate,
  validate(updateNotificationPreferenceSchema),
  usersController.updateNotificationPreference,
);
router.post('/me/avatar', authenticate, avatarUpload.single('file'), usersController.uploadAvatar);
router.post('/me/cover-image', authenticate, coverUpload.single('file'), usersController.uploadCoverImage);
router.delete('/me/cover-image', authenticate, usersController.removeCoverImage);
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

// Phase 4B — pinned resources (own).
router.get('/me/pinned-resources', authenticate, usersController.listMyPinnedResources);
router.post(
  '/me/pinned-resources',
  authenticate,
  validate(pinResourceSchema),
  usersController.pinResource,
);
router.delete('/me/pinned-resources/:resourceId', authenticate, usersController.unpinResource);
router.patch(
  '/me/pinned-resources/reorder',
  authenticate,
  validate(reorderPinnedResourcesSchema),
  usersController.reorderPinnedResources,
);

// Phase 4B — user search (must precede /:username).
router.get('/search', validate(searchUsersQuerySchema, 'query'), usersController.searchUsers);

router.get('/:username/reputation', usersController.getReputation);

// Phase 4B — follow graph.
router.post('/:username/follow', authenticate, authorize('user:follow'), usersController.followUser);
router.delete('/:username/follow', authenticate, usersController.unfollowUser);
router.get('/:username/followers', authenticateOptional, usersController.listFollowers);
router.get('/:username/following', authenticateOptional, usersController.listFollowing);

// Phase 4F — direct messaging: block/unblock (mutes both directions of
// messaging — see MessagingService.isBlocked).
router.post('/:username/block', authenticate, usersController.blockUser);
router.delete('/:username/block', authenticate, usersController.unblockUser);

// Phase 4B — activity, heatmap, badges, pinned resources (public, visibility-gated).
router.get(
  '/:username/activity',
  authenticateOptional,
  validate(listActivityQuerySchema, 'query'),
  usersController.listActivity,
);
router.get(
  '/:username/heatmap',
  authenticateOptional,
  validate(heatmapQuerySchema, 'query'),
  usersController.getHeatmap,
);
router.get('/:username/badges', authenticateOptional, usersController.listUserBadges);
router.get('/:username/pinned-resources', usersController.listPinnedResources);

// Phase 4B — profile analytics (fire-and-forget, no RBAC needed beyond optional auth).
router.post('/:username/view', authenticateOptional, usersController.recordProfileView);
router.post('/:username/share', authenticateOptional, usersController.recordProfileShare);
router.post('/:username/social-click', authenticateOptional, usersController.recordSocialLinkClick);

router.get('/:username', authenticateOptional, usersController.getPublicProfile);

export default router;
