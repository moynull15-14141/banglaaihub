import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyResults } from '@/components/resource/EmptyResults';
import { ResourceCard } from '@/components/resource/ResourceCard';
import type { Resource } from '@/types/resource';
import type { SearchResult } from '@/types/search';

export type ResourceGridView = 'grid' | 'list';

interface ResourceGridProps {
  resources: (Resource | SearchResult)[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  showStatus?: boolean;
  // My Submissions only — adds Edit/Delete actions and a visibility/updated
  // footer that would be noise on every public listing page.
  showOwnerActions?: boolean;
  // Bookmarks page only — adds a one-click "Remove" action.
  showBookmarkAction?: boolean;
  // Phase 3B — 'list' renders a single stacked column instead of a 3-up
  // grid; ResourceCard itself is unchanged either way.
  view?: ResourceGridView;
}

export function ResourceGrid({
  resources,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
  showStatus = false,
  showOwnerActions = false,
  showBookmarkAction = false,
  view = 'grid',
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
    <div
      className={
        view === 'list'
          ? 'flex flex-col gap-4'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {resources.map((resource) => (
        <div key={resource.id} className={view === 'list' ? 'sm:max-w-md' : undefined}>
          <ResourceCard
            resource={resource}
            showStatus={showStatus}
            showOwnerActions={showOwnerActions}
            showBookmarkAction={showBookmarkAction}
          />
        </div>
      ))}
    </div>
  );
}
