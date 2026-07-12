import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { RoleGuard } from '@/components/common/RoleGuard';
import { StatCardImagesView } from '@/components/admin/settings/StatCardImagesView';

// system:configure-gated on the backend (super_admin only) — same tier as
// Typography, since this is sitewide site-config, not routine moderation.
export default function AdminStatCardImagesPage() {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      <Suspense fallback={<LoadingScreen label="Loading stat card images…" />}>
        <StatCardImagesView />
      </Suspense>
    </RoleGuard>
  );
}
