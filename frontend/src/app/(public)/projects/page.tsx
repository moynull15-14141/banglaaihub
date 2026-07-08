import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Browse Bangla AI projects shared by the community.',
};

export default function ProjectsPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'Projects' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="Projects"
          description="Community projects built with or for Bangla AI."
          fixedType="project"
          emptyTitle="No projects found"
          emptyDescription="Try adjusting your filters, or be the first to submit a project."
        />
      </Suspense>
    </>
  );
}
