'use client';

import { CallToAction } from '@/components/home/CallToAction';
import { Hero } from '@/components/home/Hero';
import { HomeStatCard } from '@/components/home/HomeStatCard';
import { CategoryCard } from '@/components/resource/CategoryCard';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories } from '@/lib/hooks/useCategories';
import { useResources, useResourceTypeCounts } from '@/lib/hooks/useResources';
import { useStatCardImages } from '@/lib/hooks/useStatCardImages';
import { STAT_CARD_ICONS, STAT_CARD_LABELS, STAT_CARD_ROUTES, STAT_CARD_TYPES } from '@/lib/constants/resourceTypes';
import { ROUTES } from '@/lib/constants/routes';

export function HomeView() {
  const featured = useResources({ featured: true, limit: 6 });
  const latestDatasets = useResources({ type: 'dataset', sort: 'newest', limit: 6 });
  const popularTools = useResources({ type: 'tool', sort: 'popular', limit: 6 });
  const categories = useCategories();

  // "Community statistics" is sourced entirely from meta.total on the already-
  // public /resources endpoint (no admin-only aggregate endpoint is used) —
  // see the Phase 9 report for why a new public stats endpoint wasn't added.
  const { counts, isLoading: countsLoading } = useResourceTypeCounts();
  const { data: statCardImages } = useStatCardImages();

  return (
    <div>
      <Hero />

      <PageContainer className="py-12">
        <SectionHeader title="Community statistics" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {countsLoading
            ? STAT_CARD_TYPES.map((type) => <Skeleton key={type} className="h-28 sm:h-32" />)
            : STAT_CARD_TYPES.map((type) => (
                <HomeStatCard
                  key={type}
                  icon={STAT_CARD_ICONS[type]}
                  label={STAT_CARD_LABELS[type]}
                  value={counts[type]}
                  href={STAT_CARD_ROUTES[type]}
                  imageUrl={statCardImages?.find((image) => image.slot === type)?.url ?? null}
                />
              ))}
        </div>
      </PageContainer>

      <PageContainer className="py-6">
        <SectionHeader title="Featured resources" viewAllHref={ROUTES.resources} />
        <ResourceGrid
          resources={featured.data?.data}
          isLoading={featured.isLoading}
          isError={featured.isError}
          onRetry={() => void featured.refetch()}
        />
      </PageContainer>

      <PageContainer className="py-6">
        <SectionHeader title="Latest datasets" viewAllHref={ROUTES.datasets} />
        <ResourceGrid
          resources={latestDatasets.data?.data}
          isLoading={latestDatasets.isLoading}
          isError={latestDatasets.isError}
          onRetry={() => void latestDatasets.refetch()}
        />
      </PageContainer>

      <PageContainer className="py-6">
        <SectionHeader title="Popular tools" viewAllHref={ROUTES.tools} />
        <ResourceGrid
          resources={popularTools.data?.data}
          isLoading={popularTools.isLoading}
          isError={popularTools.isError}
          onRetry={() => void popularTools.refetch()}
        />
      </PageContainer>

      <PageContainer className="py-6">
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
      </PageContainer>

      <div className="py-6">
        <CallToAction />
      </div>
    </div>
  );
}
