'use client';

import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Bookmark, ExternalLink, FileText } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { DetailSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { ResourceMeta } from '@/components/resource/ResourceMeta';
import { ResourceTypeMetadata } from '@/components/resource/ResourceTypeMetadata';
import { ShareButtons } from '@/components/resource/ShareButtons';
import { TagBadge } from '@/components/resource/TagBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserCard } from '@/components/user/UserCard';
import { ResourceJsonLd } from '@/components/seo/JsonLd';
import { useResource } from '@/lib/hooks/useResources';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { formatDate } from '@/lib/utils/format';

interface ResourceDetailViewProps {
  slug: string;
}

export function ResourceDetailView({ slug }: ResourceDetailViewProps) {
  const { data: resource, isLoading, isError, error, refetch } = useResource(slug);

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
        />
        <p className="text-xs text-muted-foreground">Last updated {formatDate(resource.updated_at)}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex" tabIndex={0}>
                <Button variant="outline" disabled>
                  <Bookmark className="size-4" aria-hidden="true" />
                  Bookmark
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Bookmarking is coming soon</TooltipContent>
          </Tooltip>
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
    </PageContainer>
  );
}
