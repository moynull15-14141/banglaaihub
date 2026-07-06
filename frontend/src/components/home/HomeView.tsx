'use client';

import { Database, FileText, Folder, Wrench } from 'lucide-react';
import { CallToAction } from '@/components/home/CallToAction';
import { Hero } from '@/components/home/Hero';
import { CategoryCard } from '@/components/resource/CategoryCard';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/lib/hooks/useCategories';
import { useResources } from '@/lib/hooks/useResources';
import { ROUTES } from '@/lib/constants/routes';

export function HomeView() {
  const featured = useResources({ featured: true, limit: 6 });
  const latestDatasets = useResources({ type: 'dataset', sort: 'newest', limit: 6 });
  const popularTools = useResources({ type: 'tool', sort: 'popular', limit: 6 });
  const categories = useCategories();

  // "Community statistics" is sourced entirely from meta.total on the already-
  // public /resources endpoint (no admin-only aggregate endpoint is used) —
  // see the Phase 9 report for why a new public stats endpoint wasn't added.
  const totalResources = useResources({ limit: 1 });
  const totalDatasets = useResources({ type: 'dataset', limit: 1 });
  const totalPapers = useResources({ type: 'paper', limit: 1 });
  const totalTools = useResources({ type: 'tool', limit: 1 });

  return (
    <div>
      <Hero />

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader title="Community statistics" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {totalResources.isLoading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : (
            <>
              <StatsCard icon={Folder} label="Resources" value={totalResources.data?.meta.total ?? 0} />
              <StatsCard icon={Database} label="Datasets" value={totalDatasets.data?.meta.total ?? 0} />
              <StatsCard icon={FileText} label="Papers" value={totalPapers.data?.meta.total ?? 0} />
              <StatsCard icon={Wrench} label="Tools" value={totalTools.data?.meta.total ?? 0} />
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader title="Featured resources" viewAllHref={ROUTES.resources} />
        <ResourceGrid
          resources={featured.data?.data}
          isLoading={featured.isLoading}
          isError={featured.isError}
          onRetry={() => void featured.refetch()}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader title="Latest datasets" viewAllHref={ROUTES.datasets} />
        <ResourceGrid
          resources={latestDatasets.data?.data}
          isLoading={latestDatasets.isLoading}
          isError={latestDatasets.isError}
          onRetry={() => void latestDatasets.refetch()}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader title="Popular tools" viewAllHref={ROUTES.tools} />
        <ResourceGrid
          resources={popularTools.data?.data}
          isLoading={popularTools.isLoading}
          isError={popularTools.isError}
          onRetry={() => void popularTools.refetch()}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <SectionHeader title="Browse categories" />
        {categories.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(categories.data ?? []).map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>

      <CallToAction />
    </div>
  );
}
