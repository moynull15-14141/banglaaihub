import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCategoryBySlug } from '@/lib/api/categories';
import { CategoryView } from '@/components/resource/CategoryView';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const category = await getCategoryBySlug(slug);
    return {
      title: category.name,
      description: category.description ?? `Browse resources in ${category.name}.`,
    };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  return (
    <PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <CategoryView slug={slug} />
      </Suspense>
    </PageContainer>
  );
}
