import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { AdminDashboardStats, AdminUser, AuditLogEntry, SearchAnalyticsSummary } from '@/types/admin';
import type { ListResourcesParams, Resource } from '@/types/resource';
import type { ListReportsParams, Report } from '@/types/report';
import type {
  ContributorApplicationAdminDetail,
  ContributorApplicationDecisionInput,
  ContributorApplicationListItem,
  ContributorApplicationStatus,
} from '@/types/contributor-application';

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardStats>>('/admin/dashboard');
  return response.data.data;
}

export async function getAutoApprovalSettingAdmin(): Promise<{ require_manual_approval: boolean }> {
  const response = await apiClient.get<ApiSuccessResponse<{ require_manual_approval: boolean }>>(
    '/admin/settings/auto-approval',
  );
  return response.data.data;
}

export async function updateAutoApprovalSettingAdmin(
  requireManualApproval: boolean,
): Promise<{ require_manual_approval: boolean }> {
  const response = await apiClient.patch<ApiSuccessResponse<{ require_manual_approval: boolean }>>(
    '/admin/settings/auto-approval',
    { require_manual_approval: requireManualApproval },
  );
  return response.data.data;
}

export interface AdminListResult<T> {
  data: T[];
  meta: ResponseMeta;
}

export async function listPendingResourcesAdmin(
  params: ListResourcesParams = {},
): Promise<AdminListResult<Resource>> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/admin/resources/pending', {
    params,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function approveResourceAdmin(id: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/admin/resources/${encodeURIComponent(id)}/approve`,
  );
  return response.data.data;
}

export async function rejectResourceAdmin(id: string, reason?: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/admin/resources/${encodeURIComponent(id)}/reject`,
    reason ? { reason } : undefined,
  );
  return response.data.data;
}

export async function featureResourceAdmin(id: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/admin/resources/${encodeURIComponent(id)}/feature`,
  );
  return response.data.data;
}

export async function unfeatureResourceAdmin(id: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/admin/resources/${encodeURIComponent(id)}/unfeature`,
  );
  return response.data.data;
}

export async function restoreResourceAdmin(id: string): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/admin/resources/${encodeURIComponent(id)}/restore`,
  );
  return response.data.data;
}

// --- Reports (Phase 4A — reviews/comments/resources) -----------------------

export async function listReportsAdmin(params: ListReportsParams = {}): Promise<AdminListResult<Report>> {
  const response = await apiClient.get<ApiSuccessResponse<Report[]>>('/admin/reports', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function resolveReportAdmin(id: string): Promise<Report> {
  const response = await apiClient.patch<ApiSuccessResponse<Report>>(
    `/admin/reports/${encodeURIComponent(id)}/resolve`,
  );
  return response.data.data;
}

export async function rejectReportAdmin(id: string, reason?: string): Promise<Report> {
  const response = await apiClient.patch<ApiSuccessResponse<Report>>(
    `/admin/reports/${encodeURIComponent(id)}/reject`,
    reason ? { reason } : undefined,
  );
  return response.data.data;
}

// --- Phase 4B — profile moderation -------------------------------------------

export async function verifyUserAdmin(id: string): Promise<AdminUser> {
  const response = await apiClient.post<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${encodeURIComponent(id)}/verify`,
  );
  return response.data.data;
}

export async function unverifyUserAdmin(id: string): Promise<AdminUser> {
  const response = await apiClient.delete<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${encodeURIComponent(id)}/verify`,
  );
  return response.data.data;
}

export async function resetUserCoverImageAdmin(id: string): Promise<void> {
  await apiClient.post(`/admin/users/${encodeURIComponent(id)}/cover-image/reset`);
}

export async function removeFollowAdmin(followId: string): Promise<void> {
  await apiClient.delete(`/admin/follows/${encodeURIComponent(followId)}`);
}

export interface ListUsersParams {
  search?: string;
  role?: string;
  status?: 'active' | 'suspended' | 'banned';
  sort?: 'newest' | 'oldest';
  // 'staff' scopes the list to moderator/editor/admin/super_admin accounts —
  // see backend/src/services/users.service.ts's STAFF_ROLES.
  scope?: 'all' | 'staff';
  page?: number;
  limit?: number;
}

export async function listUsersAdmin(
  params: ListUsersParams = {},
): Promise<AdminListResult<AdminUser>> {
  const response = await apiClient.get<ApiSuccessResponse<AdminUser[]>>('/admin/users', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function updateUserRolesAdmin(id: string, roleNames: string[]): Promise<AdminUser> {
  const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${encodeURIComponent(id)}/roles`,
    { role_names: roleNames },
  );
  return response.data.data;
}

export async function updateUserStatusAdmin(
  id: string,
  status: 'active' | 'suspended' | 'banned',
): Promise<AdminUser> {
  const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
    `/admin/users/${encodeURIComponent(id)}/status`,
    { status },
  );
  return response.data.data;
}

export async function deleteUserAdmin(id: string): Promise<void> {
  await apiClient.delete(`/admin/users/${encodeURIComponent(id)}`);
}

export interface ListContributorApplicationsParams {
  status?: ContributorApplicationStatus;
  sort?: 'newest' | 'oldest';
  search?: string;
  country?: string;
  profession?: string;
  organization?: string;
  expertise?: string;
  page?: number;
  limit?: number;
}

export async function listContributorApplicationsAdmin(
  params: ListContributorApplicationsParams = {},
): Promise<AdminListResult<ContributorApplicationListItem>> {
  const response = await apiClient.get<ApiSuccessResponse<ContributorApplicationListItem[]>>(
    '/admin/contributor-applications',
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getContributorApplicationAdmin(
  id: string,
): Promise<ContributorApplicationAdminDetail> {
  const response = await apiClient.get<ApiSuccessResponse<ContributorApplicationAdminDetail>>(
    `/admin/contributor-applications/${encodeURIComponent(id)}`,
  );
  return response.data.data;
}

export async function approveContributorApplicationAdmin(
  id: string,
  input: ContributorApplicationDecisionInput = {},
): Promise<ContributorApplicationAdminDetail> {
  const response = await apiClient.patch<ApiSuccessResponse<ContributorApplicationAdminDetail>>(
    `/admin/contributor-applications/${encodeURIComponent(id)}/approve`,
    input,
  );
  return response.data.data;
}

export async function rejectContributorApplicationAdmin(
  id: string,
  input: ContributorApplicationDecisionInput = {},
): Promise<ContributorApplicationAdminDetail> {
  const response = await apiClient.patch<ApiSuccessResponse<ContributorApplicationAdminDetail>>(
    `/admin/contributor-applications/${encodeURIComponent(id)}/reject`,
    input,
  );
  return response.data.data;
}

export async function requestContributorApplicationRevisionAdmin(
  id: string,
  input: ContributorApplicationDecisionInput = {},
): Promise<ContributorApplicationAdminDetail> {
  const response = await apiClient.patch<ApiSuccessResponse<ContributorApplicationAdminDetail>>(
    `/admin/contributor-applications/${encodeURIComponent(id)}/request-revision`,
    input,
  );
  return response.data.data;
}

// Phase 3B — gated by the same system:audit_log_view permission as audit logs.
export async function getSearchAnalyticsAdmin(): Promise<SearchAnalyticsSummary> {
  const response = await apiClient.get<ApiSuccessResponse<SearchAnalyticsSummary>>('/admin/search-analytics');
  return response.data.data;
}

export async function listAuditLogsAdmin(
  params: { sort?: 'newest' | 'oldest'; limit?: number } = {},
): Promise<AdminListResult<AuditLogEntry>> {
  const response = await apiClient.get<ApiSuccessResponse<AuditLogEntry[]>>('/admin/audit-logs', {
    params,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}
