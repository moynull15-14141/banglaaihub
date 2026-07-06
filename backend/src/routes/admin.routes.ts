import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get(
  '/resources/pending',
  authenticate,
  authorize('resource:approve'),
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
router.get('/users', authenticate, authorize('user:manage'), adminController.listUsers);
router.put(
  '/users/:id/role',
  authenticate,
  authorize('user:role_change'),
  adminController.changeUserRole,
);
router.post('/users/:id/ban', authenticate, authorize('user:ban'), adminController.banUser);
router.get('/reports', authenticate, authorize('report:resolve'), adminController.listReports);
router.post(
  '/reports/:id/resolve',
  authenticate,
  authorize('report:resolve'),
  adminController.resolveReport,
);
router.get(
  '/audit-logs',
  authenticate,
  authorize('system:audit_log_view'),
  adminController.listAuditLogs,
);

export default router;
