import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RoleGuard } from '@/components/common/RoleGuard';
import { FontSettingsView } from '@/components/admin/settings/FontSettingsView';

// system:configure-gated on the backend (super_admin only) — same tier as
// Dashboard/Categories, since this is sitewide infrastructure.
export default function AdminFontSettingsPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <Suspense fallback={<LoadingScreen label="Loading typography settings…" />}>
        <FontSettingsView />
      </Suspense>
    </RoleGuard>
  );
}
