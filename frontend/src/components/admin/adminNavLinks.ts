import {
  Award,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  Flag,
  FolderTree,
  LayoutDashboard,
  Rss,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
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
  {
    href: ROUTES.admin,
    label: 'Dashboard',
    icon: LayoutDashboard,
    // admin:manage-gated (see GET /admin/dashboard) — same as Categories
    // below, admin:manage is only granted to 'super_admin' in
    // ROLE_PERMISSIONS (backend/scripts/seed.ts); a plain 'admin' would 403.
    roles: ['super_admin'],
  },
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
  { href: ROUTES.adminBadges, label: 'Badges', icon: Award, roles: ['admin', 'super_admin'] },
  {
    href: ROUTES.adminCategories,
    label: 'Categories',
    icon: FolderTree,
    // admin:manage-gated (see categoriesRouter's POST/PUT/DELETE) — unlike
    // Badges (user:manage_badges, granted to 'admin'), admin:manage is only
    // granted to 'super_admin' in ROLE_PERMISSIONS (backend/scripts/seed.ts).
    // A plain 'admin' can list categories (that endpoint is public) but
    // every create/update/delete would 403, so don't show this to 'admin'.
    roles: ['super_admin'],
  },
  {
    href: ROUTES.adminReports,
    label: 'Reports',
    icon: Flag,
    roles: ['editor', 'admin', 'super_admin'],
  },
  {
    href: ROUTES.adminSearchAnalytics,
    label: 'Search Analytics',
    icon: Search,
    roles: ['admin', 'super_admin'],
  },
  {
    href: ROUTES.adminFeed,
    label: 'Feed Engine',
    icon: Rss,
    // Pin management needs resource:feature (editor tier); the page itself
    // hides the admin:manage-only sections (weights, announcements) for a
    // non-admin editor — see FeedAdminView.tsx.
    roles: ['editor', 'admin', 'super_admin'],
  },
  {
    href: ROUTES.adminContentArticles,
    label: 'Articles',
    icon: FileText,
    // content:create/edit/publish are all editor-tier permissions (see
    // backend/scripts/seed.ts) — same gating tier as the rest of the
    // editorial-staff pages above.
    roles: ['editor', 'admin', 'super_admin'],
  },
  {
    href: ROUTES.adminContentSeo,
    label: 'SEO Center',
    icon: TrendingUp,
    // Phase 5A-2 — gated content:edit (editor tier), same as Articles above.
    roles: ['editor', 'admin', 'super_admin'],
  },
  {
    href: ROUTES.adminContentEditorial,
    label: 'Editorial Dashboard',
    icon: ClipboardList,
    // Phase 5A-3 — also visible to the non-hierarchical specialization
    // roles (writer/seo_editor/publisher, see backend/scripts/seed.ts's
    // SPECIALIZATION_ROLES) — each sees only what their own permissions
    // actually unlock once inside the page itself.
    roles: ['editor', 'admin', 'super_admin', 'writer', 'seo_editor', 'publisher'],
  },
  {
    href: ROUTES.adminContentCalendar,
    label: 'Content Calendar',
    icon: CalendarDays,
    roles: ['editor', 'admin', 'super_admin', 'publisher'],
  },
  {
    href: ROUTES.adminContentScheduleQueue,
    label: 'Schedule Queue',
    icon: CalendarClock,
    roles: ['editor', 'admin', 'super_admin', 'publisher'],
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
