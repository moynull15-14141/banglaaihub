import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'Prompts',
  description: 'Browse Bangla AI prompts shared by the community.',
};

export default function PromptsPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'Prompts' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="Prompts"
          description="Reusable prompts shared by the community."
          fixedType="prompt"
          emptyTitle="No prompts found"
          emptyDescription="Try adjusting your filters, or be the first to submit a prompt."
        />
      </Suspense>
    </>
  );
}
