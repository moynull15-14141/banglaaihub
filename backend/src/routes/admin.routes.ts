import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  listAuditLogsQuerySchema,
  listReportsQuerySchema,
  listUsersQuerySchema,
  rejectReportSchema,
  updateReportStatusSchema,
  updateUserRolesSchema,
  updateUserStatusSchema,
} from '../validators/admin.validator';
import { updateProfileSchema } from '../validators/user.validator';
import { listResourcesQuerySchema } from '../validators/resource.validator';
import {
  contributorApplicationDecisionSchema,
  listContributorApplicationsQuerySchema,
} from '../validators/contributor-application.validator';

const router = Router();

// --- Resource moderation ---
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

export default router;
