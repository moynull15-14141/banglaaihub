import { z } from 'zod';

const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
const REPORT_REASONS = ['spam', 'copyright', 'wrong_data', 'duplicate', 'inappropriate'] as const;

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
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

export const listReportsQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  reason: z.enum(REPORT_REASONS).optional(),
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

export const listAuditLogsQuerySchema = z.object({
  actor_id: z.string().uuid().optional(),
  target_type: z.string().optional(),
  action: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sort: z.enum(['newest', 'oldest']).optional(),
});
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
