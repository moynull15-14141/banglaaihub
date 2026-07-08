import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceListingView } from '@/components/resource/ResourceListingView';

export const metadata: Metadata = {
  title: 'News',
  description: 'Bangla AI news and announcements shared by the community.',
};

export default function NewsPage() {
  return (
    <>
      <PageContainer className="pb-0">
        <Breadcrumb items={[{ label: 'News' }]} />
      </PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <ResourceListingView
          title="News"
          description="News and announcements shared by the community."
          fixedType="news"
          emptyTitle="No news found"
          emptyDescription="Try adjusting your filters, or be the first to submit a news item."
        />
      </Suspense>
    </>
  );
}
