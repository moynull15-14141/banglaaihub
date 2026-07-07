import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RoleGuard } from '@/components/common/RoleGuard';
import { AdminShell } from '@/components/admin/AdminShell';
import { ADMIN_PANEL_ACCESS_ROLES } from '@/components/admin/adminNavLinks';

// This is the outer, coarse gate — anyone who can see at least one admin
// page (per adminNavLinks.ts's per-link `roles`) gets into the shell.
// Individual pages that need a narrower tier (Dashboard/Users are admin+
// only, editor can't see them) add their own inner RoleGuard — see
// (admin)/admin/page.tsx and (admin)/admin/users/page.tsx.
// This mirrors the backend's RBAC role hierarchy (doc 13) but is a UX
// convenience only — the backend's authorize() middleware remains the real
// enforcement point.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={ADMIN_PANEL_ACCESS_ROLES}>
        <AdminShell>{children}</AdminShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}
