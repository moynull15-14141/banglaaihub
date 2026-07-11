'use client';

import { notFound } from 'next/navigation';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { DetailSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { TagBadge } from '@/components/resource/TagBadge';
import { ShareButtons } from '@/components/resource/ShareButtons';
import { UserCard } from '@/components/user/UserCard';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import { useResource } from '@/lib/hooks/useResources';
import { ROUTES } from '@/lib/constants/routes';
import { formatDate } from '@/lib/utils/format';

interface ArticleDetailViewProps {
  slug: string;
}

export function ArticleDetailView({ slug }: ArticleDetailViewProps) {
  const { data: resource, isLoading, isError, refetch } = useResource(slug);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load this article" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  // A draft/scheduled/archived article, or one that doesn't exist, both read
  // as "not found" to an ordinary visitor — assertCanView on the backend
  // already enforces this (404, never 403) for anyone but the author/editor.
  if (!resource || resource.type !== 'article' || !resource.article) {
    notFound();
  }

  const { article } = resource;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <PageContainer className="max-w-[968px]">
      <ArticleJsonLd resource={resource} />
      <Breadcrumb items={[{ label: 'Articles', href: ROUTES.articles }, { label: resource.title }]} />

      <article className="mt-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{resource.title}</h1>
        {article.excerpt ? <p className="mt-3 text-lg text-muted-foreground">{article.excerpt}</p> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {resource.published_at ? <span>{formatDate(resource.published_at)}</span> : null}
          {article.reading_time_minutes ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{article.reading_time_minutes} min read</span>
            </>
          ) : null}
        </div>

        {resource.author ? (
          <div className="mt-4">
            <UserCard
              username={resource.author.username}
              displayName={resource.author.display_name}
              avatarUrl={resource.author.avatar_url}
            />
          </div>
        ) : null}

        {article.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed/external R2 URL, no fixed domain to allowlist
          <img
            src={article.featured_image_url}
            alt=""
            className="mt-6 aspect-video w-full rounded-xl object-cover"
          />
        ) : null}

        {article.body ? (
          <div
            className="mt-6 max-w-none text-base leading-relaxed [&_a]:text-brand [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-sm [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
            // The backend sanitizes Article.body with isomorphic-dompurify
            // before it's ever persisted (resources.service.ts's
            // sanitizeArticleBody) — this is not raw, unsanitized user input.
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        ) : null}

        {resource.tags.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        ) : null}

        {article.allow_sharing ? (
          <div className="mt-6">
            <ShareButtons slug={resource.slug} url={`${appUrl}${ROUTES.article(resource.slug)}`} title={resource.title} />
          </div>
        ) : null}
      </article>
    </PageContainer>
  );
}
