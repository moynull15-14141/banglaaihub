import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { ResourceCard } from '@/components/resource/ResourceCard';
import type { Resource } from '@/types/resource';
import type { SearchResult } from '@/types/search';

interface ResourceGridProps {
  resources: (Resource | SearchResult)[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ResourceGrid({
  resources,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
}: ResourceGridProps) {
  if (isLoading) {
    return <CardGridSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load resources"
        description="Something went wrong while fetching data from the server."
        onRetry={onRetry}
      />
    );
  }

  if (!resources || resources.length === 0) {
    return <EmptyResults title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
