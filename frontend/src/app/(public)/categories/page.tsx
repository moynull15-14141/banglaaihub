import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CategoriesIndexView } from '@/components/resource/CategoriesIndexView';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { PageContainer } from '@/components/common/PageContainer';

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Browse Bangla AI Hub resources by category.',
};

export default function CategoriesPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <CategoriesIndexView />
      </Suspense>
    </PageContainer>
  );
}
