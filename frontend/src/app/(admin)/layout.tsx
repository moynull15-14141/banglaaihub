import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { RoleGuard } from '@/components/common/RoleGuard';

// Per doc 12's routing table: /admin/* is "Admin only". This mirrors the
// backend's RBAC role hierarchy (doc 13) but is a UX convenience only — the
// backend's authorize() middleware remains the real enforcement point.
const ADMIN_ROLES = ['admin', 'super_admin'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={ADMIN_ROLES}>{children}</RoleGuard>
    </ProtectedRoute>
  );
}
