import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as paymentSettingsController from '../controllers/paymentSettings.controller';
import * as payoutController from '../controllers/payout.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { createRateLimiter } from '../middleware/rateLimiter';
import { feedAnnouncementImageUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  listPayoutsQuerySchema,
  markPayoutPaidSchema,
  payoutDecisionSchema,
} from '../validators/payout.validator';
import {
  createBadgeSchema,
  grantBadgeSchema,
  listAuditLogsQuerySchema,
  listReportsQuerySchema,
  listUsersQuerySchema,
  rejectReportSchema,
  rejectResourceSchema,
  updateAutoApprovalSettingSchema,
  updateBadgeSchema,
  updateReportStatusSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
} from '../validators/admin.validator';
import {
  createFeedAnnouncementSchema,
  createFeedPinSchema,
  previewFeedSchema,
  updateFeedAnnouncementSchema,
  updateFeedConfigSchema,
  updateFeedPinSchema,
} from '../validators/feed.validator';
import { updateProfileSchema } from '../validators/user.validator';
import { listResourcesQuerySchema } from '../validators/resource.validator';
import {
  contributorApplicationDecisionSchema,
  listContributorApplicationsQuerySchema,
} from '../validators/contributor-application.validator';

const router = Router();

// doc 13's rate-limiting table: "Admin endpoints" — 30/min, tighter than the
// 300/min "All other GET" default. Every route in this file is admin-tier
// (authenticate + authorize(...) on all of them), so this applies file-wide.
router.use(createRateLimiter({ windowMs: 60 * 1000, max: 30 }));

// --- Resource moderation ---
router.get(
  '/settings/auto-approval',
  authenticate,
  authorize('resource:approve'),
  adminController.getAutoApprovalSetting,
);
router.patch(
  '/settings/auto-approval',
  authenticate,
  authorize('resource:approve'),
  validate(updateAutoApprovalSettingSchema),
  adminController.updateAutoApprovalSetting,
);
router.get(
  '/resources/pending',
  authenticate,
  authorize('resource:approve'),
  validate(listResourcesQuerySchema, 'query'),
  adminController.listPendingResources,
);
router.post(
  '/resources/:id/approve',
  authenticate,
  authorize('resource:approve'),
  adminController.approveResource,
);
router.post(
  '/resources/:id/reject',
  authenticate,
  authorize('resource:approve'),
  validate(rejectResourceSchema),
  adminController.rejectResource,
);
router.post(
  '/resources/:id/feature',
  authenticate,
  authorize('resource:feature'),
  adminController.featureResource,
);
router.post(
  '/resources/:id/unfeature',
  authenticate,
  authorize('resource:feature'),
  adminController.unfeatureResource,
);
router.post(
  '/resources/:id/restore',
  authenticate,
  authorize('resource:edit_any'),
  adminController.restoreResource,
);

// --- User management ---
router.get(
  '/users',
  authenticate,
  authorize('user:manage'),
  validate(listUsersQuerySchema, 'query'),
  adminController.listUsers,
);
router.get('/users/:id', authenticate, authorize('user:manage'), adminController.getUserById);
router.patch(
  '/users/:id',
  authenticate,
  authorize('user:manage'),
  validate(updateProfileSchema),
  adminController.updateUser,
);
router.patch(
  '/users/:id/status',
  authenticate,
  authorize('user:ban'),
  validate(updateUserStatusSchema),
  adminController.updateUserStatus,
);
router.patch(
  '/users/:id/roles',
  authenticate,
  authorize('user:role_change'),
  validate(updateUserRolesSchema),
  adminController.updateUserRoles,
);
router.delete('/users/:id', authenticate, authorize('user:ban'), adminController.deleteUser);

// --- Phase 4B — profile moderation ---
router.post('/users/:id/verify', authenticate, authorize('user:verify'), adminController.verifyUser);
router.delete('/users/:id/verify', authenticate, authorize('user:verify'), adminController.unverifyUser);
router.post(
  '/users/:id/cover-image/reset',
  authenticate,
  authorize('profile:moderate'),
  adminController.resetUserCoverImage,
);
router.get(
  '/users/:id/activity',
  authenticate,
  authorize('user:manage'),
  adminController.getUserActivity,
);
router.post(
  '/users/:id/badges',
  authenticate,
  authorize('user:manage_badges'),
  validate(grantBadgeSchema),
  adminController.grantBadge,
);
router.delete(
  '/users/:id/badges/:badgeId',
  authenticate,
  authorize('user:manage_badges'),
  adminController.revokeBadge,
);
router.delete('/follows/:id', authenticate, authorize('profile:moderate'), adminController.removeFollow);

// --- Phase 4B — badge catalog ---
router.get('/badges', authenticate, authorize('user:manage_badges'), adminController.listBadges);
router.post(
  '/badges',
  authenticate,
  authorize('user:manage_badges'),
  validate(createBadgeSchema),
  adminController.createBadge,
);
router.patch(
  '/badges/:id',
  authenticate,
  authorize('user:manage_badges'),
  validate(updateBadgeSchema),
  adminController.updateBadge,
);
router.delete('/badges/:id', authenticate, authorize('user:manage_badges'), adminController.deleteBadge);

// --- Reports ---
router.get(
  '/reports',
  authenticate,
  authorize('report:resolve'),
  validate(listReportsQuerySchema, 'query'),
  adminController.listReports,
);
router.get('/reports/:id', authenticate, authorize('report:resolve'), adminController.getReportById);
router.patch(
  '/reports/:id',
  authenticate,
  authorize('report:resolve'),
  validate(updateReportStatusSchema),
  adminController.updateReport,
);
router.patch(
  '/reports/:id/resolve',
  authenticate,
  authorize('report:resolve'),
  adminController.resolveReport,
);
router.patch(
  '/reports/:id/reject',
  authenticate,
  authorize('report:reject'),
  validate(rejectReportSchema),
  adminController.rejectReport,
);

// --- Contributor applications ---
router.get(
  '/contributor-applications',
  authenticate,
  authorize('contributor_application:review'),
  validate(listContributorApplicationsQuerySchema, 'query'),
  adminController.listContributorApplications,
);
router.get(
  '/contributor-applications/:id',
  authenticate,
  authorize('contributor_application:review'),
  adminController.getContributorApplicationById,
);
router.patch(
  '/contributor-applications/:id/approve',
  authenticate,
  authorize('contributor_application:review'),
  validate(contributorApplicationDecisionSchema),
  adminController.approveContributorApplication,
);
router.patch(
  '/contributor-applications/:id/reject',
  authenticate,
  authorize('contributor_application:review'),
  validate(contributorApplicationDecisionSchema),
  adminController.rejectContributorApplication,
);
router.patch(
  '/contributor-applications/:id/request-revision',
  authenticate,
  authorize('contributor_application:review'),
  validate(contributorApplicationDecisionSchema),
  adminController.requestContributorApplicationRevision,
);

// --- Audit logs (read-only) ---
router.get(
  '/audit-logs',
  authenticate,
  authorize('system:audit_log_view'),
  validate(listAuditLogsQuerySchema, 'query'),
  adminController.listAuditLogs,
);

// --- Dashboard ---
router.get('/dashboard', authenticate, authorize('admin:manage'), adminController.getDashboard);

// --- Search analytics (read-only) — Phase 3B, gated the same as audit logs. ---
router.get(
  '/search-analytics',
  authenticate,
  authorize('system:audit_log_view'),
  adminController.getSearchAnalytics,
);

// Re-syncs both MeiliSearch indexes from Postgres — the HTTP equivalent of
// `npm run search:sync`/`search:sync:users`, added because Render's free
// tier has no shell access to run those scripts directly. system:configure
// (super_admin only) — this is an infra operation, not routine moderation.
router.post(
  '/search/rebuild-index',
  authenticate,
  authorize('system:configure'),
  adminController.rebuildSearchIndex,
);

// Paid Resource Downloads (Phase A) — manual purchase-grant support tool,
// see manuallyGrantResourcePurchase()'s own comment. system:configure
// (super_admin only) — moves wallet balances, same tier as every other
// sitewide-infra/financial action in this file.
router.post(
  '/resource-purchases/manual',
  authenticate,
  authorize('system:configure'),
  adminController.manuallyGrantResourcePurchase,
);

// Paid Resource Downloads — full sales ledger + platform revenue summary.
// system:configure (super_admin only) — you asked for this to be
// super_admin-visible specifically, not the broader admin tier payouts uses.
router.get(
  '/resource-purchases',
  authenticate,
  authorize('system:configure'),
  adminController.listResourcePurchases,
);
router.get(
  '/resource-purchases/summary',
  authenticate,
  authorize('system:configure'),
  adminController.getRevenueSummary,
);

// SSLCommerz credentials, configurable from the admin panel instead of only
// via backend .env — system:configure (super_admin only), same tier as
// every other sitewide-infra setting.
router.get(
  '/payment-settings/sslcommerz',
  authenticate,
  authorize('system:configure'),
  paymentSettingsController.getSslcommerzSettings,
);
router.put(
  '/payment-settings/sslcommerz',
  authenticate,
  authorize('system:configure'),
  paymentSettingsController.saveSslcommerzSettings,
);

// Paid Resource Downloads (Phase C) — payout approval queue. payout:manage
// (admin/super_admin) — moves wallet balances, same tier as every other
// financial action in this file.
router.get(
  '/payouts',
  authenticate,
  authorize('payout:manage'),
  validate(listPayoutsQuerySchema, 'query'),
  payoutController.listPayoutsForAdmin,
);
router.post(
  '/payouts/:id/approve',
  authenticate,
  authorize('payout:manage'),
  validate(payoutDecisionSchema),
  payoutController.approvePayout,
);
router.post(
  '/payouts/:id/reject',
  authenticate,
  authorize('payout:manage'),
  validate(payoutDecisionSchema),
  payoutController.rejectPayout,
);
router.post(
  '/payouts/:id/mark-paid',
  authenticate,
  authorize('payout:manage'),
  validate(markPayoutPaidSchema),
  payoutController.markPayoutPaid,
);

// --- Feed engine (Phase 4D) ---------------------------------------------------------
// Weight/diversity tuning and announcements are platform-wide config — gated
// at the broader admin:manage tier. Pin management reuses resource:feature
// (the existing "can feature a resource" permission), since curating feed
// placement is a superset of that same capability.
router.get('/feed/config', authenticate, authorize('admin:manage'), adminController.getFeedConfig);
router.patch(
  '/feed/config',
  authenticate,
  authorize('admin:manage'),
  validate(updateFeedConfigSchema),
  adminController.updateFeedConfig,
);

// Phase 4C, Stage 1 — Live Preview (read-only, never persists) and
// rollback (persists via the same updateConfig() write path, so it's
// gated identically to a normal config edit). Config history itself has
// no dedicated route — see GET /admin/audit-logs?target_type=feed_config.
router.post(
  '/feed/preview',
  authenticate,
  authorize('admin:manage'),
  validate(previewFeedSchema),
  adminController.previewFeedConfig,
);
router.post(
  '/feed/config/rollback/:auditLogId',
  authenticate,
  authorize('admin:manage'),
  adminController.rollbackFeedConfig,
);

router.get('/feed/pins', authenticate, authorize('resource:feature'), adminController.listFeedPins);
router.post(
  '/feed/pins',
  authenticate,
  authorize('resource:feature'),
  validate(createFeedPinSchema),
  adminController.createFeedPin,
);
router.patch(
  '/feed/pins/:id',
  authenticate,
  authorize('resource:feature'),
  validate(updateFeedPinSchema),
  adminController.updateFeedPin,
);
router.delete('/feed/pins/:id', authenticate, authorize('resource:feature'), adminController.deleteFeedPin);

router.get('/feed/announcements', authenticate, authorize('admin:manage'), adminController.listFeedAnnouncements);
router.post(
  '/feed/announcements',
  authenticate,
  authorize('admin:manage'),
  validate(createFeedAnnouncementSchema),
  adminController.createFeedAnnouncement,
);
router.patch(
  '/feed/announcements/:id',
  authenticate,
  authorize('admin:manage'),
  validate(updateFeedAnnouncementSchema),
  adminController.updateFeedAnnouncement,
);
router.delete(
  '/feed/announcements/:id',
  authenticate,
  authorize('admin:manage'),
  adminController.deleteFeedAnnouncement,
);
router.post(
  '/feed/announcements/:id/image',
  authenticate,
  authorize('admin:manage'),
  feedAnnouncementImageUpload.single('file'),
  adminController.uploadFeedAnnouncementImage,
);
router.delete(
  '/feed/announcements/:id/image',
  authenticate,
  authorize('admin:manage'),
  adminController.removeFeedAnnouncementImage,
);

export default router;
