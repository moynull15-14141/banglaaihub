import type { Metadata } from 'next';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { FeedModeTabs } from '@/components/feed/FeedModeTabs';
import { PostComposer } from '@/components/feed/PostComposer';

export const metadata: Metadata = {
  title: 'Feed',
  description: 'The latest and trending AI resources from the BanglaAIHub community.',
};

export default function FeedPage() {
  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'Feed' }]} />
      <SectionHeader title="Feed" description="What's new and trending across the community." />
      {/* Renders nothing for guests — PostComposer returns null without a
          signed-in user. */}
      <div className="mb-6">
        <PostComposer />
      </div>
      <FeedModeTabs />
    </PageContainer>
  );
}
