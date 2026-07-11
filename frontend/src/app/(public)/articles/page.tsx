import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Articles, tutorials, guides, and announcements from Bangla AI Hub.',
};

export default function ArticlesPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'Articles' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="Articles"
          description="Articles, tutorials, guides, and announcements from the Bangla AI Hub team and community."
          fixedType="article"
          emptyTitle="No articles found"
          emptyDescription="Try adjusting your filters — new articles are published regularly."
        />
      </Suspense>
    </>
  );
}
