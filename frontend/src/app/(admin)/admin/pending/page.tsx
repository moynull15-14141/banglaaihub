import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ResourceModerationView } from '@/components/admin/moderation/ResourceModerationView';

export default function AdminPendingPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading moderation queue…" />}>
      <ResourceModerationView />
    </Suspense>
  );
}
