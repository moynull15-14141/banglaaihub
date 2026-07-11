'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Flag, Heart } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { DetailSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { AttachmentsSection } from '@/components/resource/AttachmentsSection';
import { CitationBlock } from '@/components/resource/CitationBlock';
import { DiscussionSection } from '@/components/discussion/DiscussionSection';
import { ForkPromptButton } from '@/components/resource/ForkPromptButton';
import { MoreFromAuthorCard } from '@/components/resource/MoreFromAuthorCard';
import { ReportResourceDialog } from '@/components/resource/ReportResourceDialog';
import { ResourceMeta } from '@/components/resource/ResourceMeta';
import { ResourceTypeMetadata } from '@/components/resource/ResourceTypeMetadata';
import { ReviewsSection } from '@/components/review/ReviewsSection';
import { ShareButtons } from '@/components/resource/ShareButtons';
import { SimilarResourcesCard } from '@/components/resource/SimilarResourcesCard';
import { TagBadge } from '@/components/resource/TagBadge';
import { VersionHistorySection } from '@/components/resource/VersionHistorySection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCard } from '@/components/user/UserCard';
import { ResourceJsonLd } from '@/components/seo/JsonLd';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToggleResourceLike } from '@/lib/hooks/useLikes';
import { useReportResource, useResource, useToggleResourceBookmark } from '@/lib/hooks/useResources';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { formatDate } from '@/lib/utils/format';
import type { ReportReason } from '@/lib/api/resources';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface ResourceDetailViewProps {
  slug: string;
}

export function ResourceDetailView({ slug }: ResourceDetailViewProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: resource, isLoading, isError, error, refetch } = useResource(slug);
  const toggleBookmarkMutation = useToggleResourceBookmark(slug);
  const toggleLikeMutation = useToggleResourceLike(slug);
  const reportMutation = useReportResource(slug);
  const [reportOpen, setReportOpen] = useState(false);

  function handleLikeClick() {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    if (!resource) return;
    toggleLikeMutation.mutate(
      { add: !resource.is_liked },
      {
        onError: (error) => toast.error(errorMessage(error, 'Could not update your like.')),
      },
    );
  }

  function handleBookmarkClick() {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    if (!resource) return;
    toggleBookmarkMutation.mutate(
      { add: !resource.is_bookmarked },
      {
        onSuccess: () => toast.success(resource.is_bookmarked ? 'Bookmark removed.' : 'Bookmark added.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not update your bookmark.')),
      },
    );
  }

  function handleReportClick() {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    setReportOpen(true);
  }

  function handleReportConfirm(input: { reason: ReportReason; description?: string }) {
    reportMutation.mutate(input, {
      onSuccess: () => {
        toast.success('Report submitted — a moderator will review it.');
        setReportOpen(false);
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not submit your report.')),
    });
  }

  if (isLoading) {
    return (
      <PageContainer>
        <DetailSkeleton />
      </PageContainer>
    );
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    return (
      <PageContainer>
        <ErrorState
          title="Couldn't load this resource"
          description="Something went wrong while fetching data from the server."
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  if (!resource) return null;

  const authorName = resource.author?.display_name ?? resource.author?.username ?? null;

  return (
    <PageContainer className="max-w-4xl space-y-6">
      <ResourceJsonLd resource={resource} />
      <Breadcrumb
        items={[
          { label: `${RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}s`, href: ROUTES.resources },
          { label: resource.title },
        ]}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{RESOURCE_TYPE_LABELS[resource.type] ?? resource.type}</Badge>
          {resource.category ? (
            <Badge variant="secondary">{resource.category.name}</Badge>
          ) : null}
          {resource.featured ? <Badge variant="warning">Featured</Badge> : null}
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{resource.title}</h1>
        <ResourceMeta
          viewCount={resource.view_count}
          downloadCount={resource.download_count}
          bookmarkCount={resource.bookmark_count}
          publishedAt={resource.published_at}
          avgRating={resource.avg_rating}
          reviewCount={resource.review_count}
        />
        <p className="text-xs text-muted-foreground">Last updated {formatDate(resource.updated_at)}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={resource.is_bookmarked ? 'secondary' : 'outline'}
            disabled={toggleBookmarkMutation.isPending}
            onClick={handleBookmarkClick}
          >
            {resource.is_bookmarked ? (
              <BookmarkCheck className="size-4" aria-hidden="true" />
            ) : (
              <Bookmark className="size-4" aria-hidden="true" />
            )}
            {resource.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button
            type="button"
            variant={resource.is_liked ? 'secondary' : 'outline'}
            disabled={toggleLikeMutation.isPending}
            onClick={handleLikeClick}
          >
            <Heart
              className="size-4"
              aria-hidden="true"
              fill={resource.is_liked ? 'currentColor' : 'none'}
            />
            {resource.is_liked ? 'Liked' : 'Like'}
          </Button>
          {resource.external_url ? (
            <Button asChild variant="outline">
              <a href={resource.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                External link
              </a>
            </Button>
          ) : null}
          {resource.documentation_url ? (
            <Button asChild variant="outline">
              <a href={resource.documentation_url} target="_blank" rel="noopener noreferrer">
                <FileText className="size-4" aria-hidden="true" />
                Documentation
              </a>
            </Button>
          ) : null}
          <ForkPromptButton resource={resource} />
          <Button type="button" variant="ghost" onClick={handleReportClick}>
            <Flag className="size-4" aria-hidden="true" />
            Report
          </Button>
        </div>
        <ShareButtons
          slug={resource.slug}
          url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}${resourceHref(resource.type, resource.slug)}`}
          title={resource.title}
        />
      </div>

      {resource.description ? (
        <p className="leading-relaxed whitespace-pre-line">{resource.description}</p>
      ) : null}

      {resource.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      ) : null}

      <ResourceTypeMetadata resource={resource} />

      <VersionHistorySection resource={resource} />

      <AttachmentsSection slug={resource.slug} attachments={resource.attachments} />

      <CitationBlock
        title={resource.title}
        authorName={authorName}
        publishedAt={resource.published_at}
        license={resource.license}
        url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}${resourceHref(resource.type, resource.slug)}`}
      />

      {authorName && resource.author ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Submitted by</h2>
          <UserCard
            username={resource.author.username}
            displayName={resource.author.display_name}
            avatarUrl={resource.author.avatar_url}
          />
        </div>
      ) : null}

      <SimilarResourcesCard
        type={resource.type}
        categorySlug={resource.category?.slug}
        tags={resource.tags}
        excludeSlug={resource.slug}
      />

      {resource.author && authorName ? (
        <MoreFromAuthorCard
          username={resource.author.username}
          authorName={authorName}
          excludeSlug={resource.slug}
        />
      ) : null}

      <ReviewsSection resourceSlug={resource.slug} resourceAuthorId={resource.author?.id ?? null} />

      <DiscussionSection resourceSlug={resource.slug} />

      <ReportResourceDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        resourceTitle={resource.title}
        isPending={reportMutation.isPending}
        onConfirm={handleReportConfirm}
      />
    </PageContainer>
  );
}
