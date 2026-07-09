import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTagBySlug } from '@/lib/api/tags';
import { TagView } from '@/components/resource/TagView';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const tag = await getTagBySlug(slug);
    return {
      title: `#${tag.name}`,
      description: `Browse resources tagged ${tag.name}.`,
    };
  } catch {
    return { title: 'Tag' };
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  return (
    <PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <TagView slug={slug} />
      </Suspense>
    </PageContainer>
  );
}
