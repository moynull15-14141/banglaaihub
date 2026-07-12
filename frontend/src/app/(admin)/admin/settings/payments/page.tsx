import { RoleGuard } from '@/components/common/RoleGuard';
import { PaymentSettingsView } from '@/components/admin/settings/PaymentSettingsView';

// system:configure-gated (super_admin only) — same tier as Typography/Stat
// Card Images.
export default function AdminPaymentSettingsPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <PaymentSettingsView />
    </RoleGuard>
  );
}
