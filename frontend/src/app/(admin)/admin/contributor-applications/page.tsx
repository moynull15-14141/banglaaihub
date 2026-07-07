import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ContributorApplicationsListView } from '@/components/admin/contributor-applications/ContributorApplicationsListView';

export default function AdminContributorApplicationsPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading contributor applications…" />}>
      <ContributorApplicationsListView />
    </Suspense>
  );
}
