import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type { AdminDashboardStats, AdminUser, AuditLogEntry } from '@/types/admin';
import type { Resource } from '@/types/resource';

export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardStats>>('/admin/dashboard');
  return response.data.data;
}

export interface AdminListResult<T> {
  data: T[];
  meta: ResponseMeta;
}

export async function listPendingResourcesAdmin(
  params: { limit?: number } = {},
): Promise<AdminListResult<Resource>> {
  const response = await apiClient.get<ApiSuccessResponse<Resource[]>>('/admin/resources/pending', {
    params,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function listUsersAdmin(
  params: { sort?: 'newest' | 'oldest'; limit?: number } = {},
): Promise<AdminListResult<AdminUser>> {
  const response = await apiClient.get<ApiSuccessResponse<AdminUser[]>>('/admin/users', { params });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function listAuditLogsAdmin(
  params: { sort?: 'newest' | 'oldest'; limit?: number } = {},
): Promise<AdminListResult<AuditLogEntry>> {
  const response = await apiClient.get<ApiSuccessResponse<AuditLogEntry[]>>('/admin/audit-logs', {
    params,
  });
  return { data: response.data.data, meta: response.data.meta ?? {} };
}
