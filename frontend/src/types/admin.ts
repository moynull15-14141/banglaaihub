import type { User } from './user';

export interface AdminDashboardStats {
  total_users: number;
  active_users: number;
  new_users_last_7_days: number;
  resources_by_status: Record<string, number>;
  resources_by_type: Record<string, number>;
  datasets: number;
  papers: number;
  tools: number;
  bookmarks: number;
  reports_by_status: Record<string, number>;
  pending_approvals: number;
  notifications: number;
  reputation_events: number;
}

export interface AdminUser extends User {
  status: 'active' | 'suspended' | 'banned';
  last_login_at: string | null;
}

export interface AuditLogActor {
  id: string;
  username: string;
  display_name: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  actor: AuditLogActor | null;
  created_at: string;
}
