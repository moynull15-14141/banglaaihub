import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'Models',
  description: 'Browse Bangla AI models shared by the community.',
};

export default function ModelsPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'Models' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="Models"
          description="Machine learning models shared by the community."
          fixedType="model"
          emptyTitle="No models found"
          emptyDescription="Try adjusting your filters, or be the first to submit a model."
        />
      </Suspense>
    </>
  );
}
