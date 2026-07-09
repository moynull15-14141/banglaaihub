'use client';

import Link from 'next/link';
import { Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/lib/hooks/useCategories';
import { ROUTES } from '@/lib/constants/routes';
import type { Category } from '@/types/category';

export function CategoriesIndexView() {
  const { data: categories, isLoading, isError, refetch } = useCategories();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Categories" description="Browse resources by topic." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load categories"
        description="Something went wrong while fetching data from the server."
        onRetry={() => void refetch()}
      />
    );
  }

  const topLevel = (categories ?? []).filter((category) => category.parent_id === null);

  return (
    <div className="space-y-6">
      <SectionHeader title="Categories" description="Browse resources by topic." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topLevel.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Card>
      <CardContent className="space-y-2 py-5">
        <Link
          href={ROUTES.category(category.slug)}
          className="flex items-center gap-2 font-semibold tracking-tight hover:text-brand"
        >
          <Folder className="size-4 text-brand" aria-hidden="true" />
          {category.name}
        </Link>
        {category.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
        ) : null}
        {category.children && category.children.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={ROUTES.category(child.slug)}
                className="text-xs text-muted-foreground hover:text-brand hover:underline"
              >
                {child.name}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
