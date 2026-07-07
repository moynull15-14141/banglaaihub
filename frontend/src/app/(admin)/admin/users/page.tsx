import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RoleGuard } from '@/components/common/RoleGuard';
import { UserManagementView } from '@/components/admin/users/UserManagementView';

// Narrower than the (admin) layout's outer gate: user management calls
// user:manage/user:ban/user:role_change-gated endpoints, admin/super_admin
// only — an editor can enter /admin/* generally, but not this page.
export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <Suspense fallback={<LoadingScreen label="Loading users…" />}>
        <UserManagementView />
      </Suspense>
    </RoleGuard>
  );
}
