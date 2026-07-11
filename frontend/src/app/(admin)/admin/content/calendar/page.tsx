import { RoleGuard } from '@/components/common/RoleGuard';
import { ContentCalendarView } from '@/components/admin/content/ContentCalendarView';

export default function AdminContentCalendarPage() {
  return (
    <RoleGuard allowedRoles={['editor', 'admin', 'super_admin', 'publisher']}>
      <ContentCalendarView />
    </RoleGuard>
  );
}
