import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'Datasets',
  description: 'Browse Bangla-language datasets shared by the community.',
};

export default function DatasetsPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'Datasets' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="Datasets"
          description="Bangla-language datasets shared by the community."
          fixedType="dataset"
          emptyTitle="No datasets found"
          emptyDescription="Try adjusting your filters, or be the first to submit a dataset."
        />
      </Suspense>
    </>
  );
}
