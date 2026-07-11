import { z } from 'zod';

const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
const REPORT_REASONS = ['spam', 'copyright', 'wrong_data', 'duplicate', 'inappropriate'] as const;

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
  // 'staff' scopes the Users page down to accounts holding a role that
  // grants any admin-panel access (moderator/editor/admin/super_admin) —
  // see users.service.ts's STAFF_ROLES. Deliberately excludes
  // contributor/verified_contributor: those are a content-trust tier
  // earned by regular members, not website-management access.
  scope: z.enum(['all', 'staff']).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export const updateUserRolesSchema = z.object({
  role_names: z.array(z.string()).min(1, 'At least one role is required.'),
});
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesSchema>;

export const updateAutoApprovalSettingSchema = z.object({
  require_manual_approval: z.boolean(),
});
export type UpdateAutoApprovalSettingInput = z.infer<typeof updateAutoApprovalSettingSchema>;

const REPORT_TARGET_TYPES = ['resource', 'comment', 'review', 'post'] as const;

export const listReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
  target_type: z.enum(REPORT_TARGET_TYPES).optional(),
});
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;

export const updateReportStatusSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  reason: z.string().max(500).optional(),
});
export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;

export const rejectReportSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RejectReportInput = z.infer<typeof rejectReportSchema>;

// Mirrors rejectReportSchema — POST /admin/resources/:id/reject previously
// read req.body.reason with only a typeof check (no length cap, no schema),
// unlike every other reason field in this file.
export const rejectResourceSchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RejectResourceInput = z.infer<typeof rejectResourceSchema>;

export const listAuditLogsQuerySchema = z.object({
  actor_id: z.string().uuid().optional(),
  target_type: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

// --- Phase 4B ----------------------------------------------------------------

export const createBadgeSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Key must be lowercase letters, numbers, and underscores only.'),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(50),
});
export type CreateBadgeInput = z.infer<typeof createBadgeSchema>;

export const updateBadgeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().min(1).max(50).optional(),
});
export type UpdateBadgeInput = z.infer<typeof updateBadgeSchema>;

export const grantBadgeSchema = z.object({
  badge_id: z.number().int().positive(),
});
export type GrantBadgeInput = z.infer<typeof grantBadgeSchema>;
