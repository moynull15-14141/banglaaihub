'use client';

import { useQuery } from '@tanstack/react-query';
import {
  getAdminDashboard,
  listAuditLogsAdmin,
  listPendingResourcesAdmin,
  listUsersAdmin,
} from '@/lib/api/admin';

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getAdminDashboard,
  });
}

export function useAdminPendingResources(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'resources', 'pending', limit],
    queryFn: () => listPendingResourcesAdmin({ limit }),
  });
}

export function useAdminRecentUsers(limit = 5) {
  return useQuery({
    queryKey: ['admin', 'users', 'recent', limit],
    queryFn: () => listUsersAdmin({ sort: 'newest', limit }),
  });
}

export function useAdminActivityFeed(limit = 8) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', limit],
    queryFn: () => listAuditLogsAdmin({ sort: 'newest', limit }),
  });
}
