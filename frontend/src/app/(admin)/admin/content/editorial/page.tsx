import { RoleGuard } from '@/components/common/RoleGuard';
import { EditorialDashboardView } from '@/components/admin/content/EditorialDashboardView';

export default function AdminEditorialDashboardPage() {
  return (
    <RoleGuard allowedRoles={['editor', 'admin', 'super_admin', 'writer', 'seo_editor', 'publisher']}>
      <EditorialDashboardView />
    </RoleGuard>
  );
}
