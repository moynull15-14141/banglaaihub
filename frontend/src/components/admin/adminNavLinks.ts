import { ClipboardList, Flag, LayoutDashboard, Sparkles, Users } from 'lucide-react';
import { ROUTES } from '@/lib/constants/routes';
import type { RoleName } from '@/lib/constants/roles';

// Each entry's `roles` mirrors the backend permission tier that actually
// gates its page (see backend/src/routes/admin.routes.ts): Dashboard and
// Users need admin:manage/user:manage (admin+ only), the rest need
// editor-tier permissions (resource:approve / contributor_application:review
// / report:resolve). This list is the single source of truth for who sees
// what — the "Admin Panel" entry points (dashboard sidebar, topbar, navbar)
// and the (admin) layout's outer RoleGuard both derive from it, so adding a
// new admin page here automatically updates who can reach it everywhere.
export const ADMIN_NAV_LINKS: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: RoleName[];
}[] = [
  { href: ROUTES.admin, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
  {
    href: ROUTES.adminPending,
    label: 'Pending Approvals',
    icon: ClipboardList,
    roles: ['editor', 'admin', 'super_admin'],
  },
  {
    href: ROUTES.adminContributorApplications,
    label: 'Contributor Applications',
    icon: Sparkles,
    roles: ['editor', 'admin', 'super_admin'],
  },
  { href: ROUTES.adminUsers, label: 'Users', icon: Users, roles: ['admin', 'super_admin'] },
  {
    href: ROUTES.adminReports,
    label: 'Reports',
    icon: Flag,
    roles: ['editor', 'admin', 'super_admin'],
  },
];

export function getVisibleAdminNavLinks(userRoles: string[]): typeof ADMIN_NAV_LINKS {
  return ADMIN_NAV_LINKS.filter((link) => link.roles.some((role) => userRoles.includes(role)));
}

export function canAccessAdminPanel(userRoles: string[]): boolean {
  return getVisibleAdminNavLinks(userRoles).length > 0;
}

// Union of every role referenced above — used by the (admin) layout's outer
// RoleGuard so it always matches whatever pages actually exist.
export const ADMIN_PANEL_ACCESS_ROLES: RoleName[] = Array.from(
  new Set(ADMIN_NAV_LINKS.flatMap((link) => link.roles)),
);
