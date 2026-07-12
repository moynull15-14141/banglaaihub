import { RoleGuard } from '@/components/common/RoleGuard';
import { AdminPayoutsView } from '@/components/admin/payouts/AdminPayoutsView';

// payout:manage-gated (admin/super_admin) — moves wallet balances, same
// tier as Users/Badges above in adminNavLinks.ts.
export default function AdminPayoutsPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <AdminPayoutsView />
    </RoleGuard>
  );
}
