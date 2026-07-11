import { Suspense } from 'react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ArticlesListView } from '@/components/admin/content/ArticlesListView';

export default function AdminContentArticlesPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading articles…" />}>
      <ArticlesListView />
    </Suspense>
  );
}
