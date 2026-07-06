'use client';

import { isAxiosError } from 'axios';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { useCategory, useCategoryResources } from '@/lib/hooks/useCategories';
import { ROUTES } from '@/lib/constants/routes';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryViewProps {
  slug: string;
}

export function CategoryView({ slug }: CategoryViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1') || 1;

  const category = useCategory(slug);
  const resources = useCategoryResources(slug, { page, limit: 20 });

  if (category.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <CardGridSkeleton />
      </div>
    );
  }

  if (category.isError) {
    if (isAxiosError(category.error) && category.error.response?.status === 404) {
      notFound();
    }
    return (
      <ErrorState
        title="Couldn't load this category"
        onRetry={() => void category.refetch()}
      />
    );
  }

  if (!category.data) return null;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Categories', href: ROUTES.resources }, { label: category.data.name }]} />

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {category.data.name}
        </h1>
        {category.data.description ? (
          <p className="mt-1 text-muted-foreground">{category.data.description}</p>
        ) : null}
      </div>

      <ResourceGrid
        resources={resources.data?.data}
        isLoading={resources.isLoading}
        isError={resources.isError}
        onRetry={() => void resources.refetch()}
      />

      {resources.data ? (
        <Pagination
          page={page}
          limit={resources.data.meta.limit ?? 20}
          total={resources.data.meta.total ?? 0}
          onPageChange={(nextPage) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', String(nextPage));
            router.push(`?${params.toString()}`, { scroll: false });
          }}
        />
      ) : null}
    </div>
  );
}
