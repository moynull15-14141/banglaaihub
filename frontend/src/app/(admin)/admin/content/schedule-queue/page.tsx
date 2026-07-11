import { RoleGuard } from '@/components/common/RoleGuard';
import { ScheduleQueueView } from '@/components/admin/content/ScheduleQueueView';

export default function AdminScheduleQueuePage() {
  return (
    <RoleGuard allowedRoles={['editor', 'admin', 'super_admin', 'publisher']}>
      <ScheduleQueueView />
    </RoleGuard>
  );
}
