import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { SearchView } from '@/components/search/SearchView';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search Bangla AI Hub for datasets, papers, tools, and tutorials.',
};

export default function SearchPage() {
  return (
    <PageContainer>
      <Suspense fallback={<LoadingScreen />}>
        <SearchView />
      </Suspense>
    </PageContainer>
  );
}
