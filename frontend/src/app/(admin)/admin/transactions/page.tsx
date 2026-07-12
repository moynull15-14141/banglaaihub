import { RoleGuard } from '@/components/common/RoleGuard';
import { AdminTransactionsView } from '@/components/admin/transactions/AdminTransactionsView';

// system:configure-gated (super_admin only) — full platform revenue
// visibility, same tier as Dashboard/Categories.
export default function AdminTransactionsPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <AdminTransactionsView />
    </RoleGuard>
  );
}
