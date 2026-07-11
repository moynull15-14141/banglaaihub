import type { Resource } from '@/types/resource';
import type { PublicProfile } from '@/types/user';

const SCHEMA_TYPE_BY_RESOURCE_TYPE: Record<string, string> = {
  dataset: 'Dataset',
  paper: 'ScholarlyArticle',
  tool: 'SoftwareApplication',
};

interface ResourceJsonLdProps {
  resource: Resource;
}

// `JSON.stringify` does not escape `<` — a title/description/display-name
// containing `</script>` would prematurely close this tag and let arbitrary
// markup execute. Escaping every `<` as its unicode form is inert to JSON
// parsers (schema.org crawlers included) but can no longer be interpreted
// as an HTML tag boundary by the browser.
function safeJsonLdStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

// Schema.org structured data — mirrors the DatasetJsonLd pattern documented
// in project-planning/12-frontend-architecture.md, generalized across
// resource types since the backend serves all types from one /resources/:slug
// endpoint.
export function ResourceJsonLd({ resource }: ResourceJsonLdProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': SCHEMA_TYPE_BY_RESOURCE_TYPE[resource.type] ?? 'CreativeWork',
    name: resource.title,
    description: resource.description,
    url: `${appUrl}/${resource.type}s/${resource.slug}`,
    license: resource.license ?? undefined,
    creator: resource.author
      ? { '@type': 'Person', name: resource.author.display_name ?? resource.author.username }
      : undefined,
    datePublished: resource.published_at ?? undefined,
    keywords: resource.tags.length > 0 ? resource.tags.join(', ') : undefined,
    inLanguage: resource.language,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}

// Phase 5A-1 (Content Platform) — maps the CMS's internal content_type
// taxonomy to the closest real schema.org type; everything else falls back
// to the generic 'Article' (schema.org has no dedicated type per genre like
// "tutorial" or "opinion").
const SCHEMA_TYPE_BY_ARTICLE_CONTENT_TYPE: Record<string, string> = {
  news: 'NewsArticle',
  announcement: 'NewsArticle',
};

interface ArticleJsonLdProps {
  resource: Resource;
}

// Same safeJsonLdStringify escaping as ResourceJsonLd above, but with the
// datePublished/dateModified/author shape schema.org's Article type actually
// expects, plus the featured image — ResourceJsonLd's generic CreativeWork
// shape doesn't cover either.
export function ArticleJsonLd({ resource }: ArticleJsonLdProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const article = resource.article;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': (article && SCHEMA_TYPE_BY_ARTICLE_CONTENT_TYPE[article.content_type]) ?? 'Article',
    headline: resource.title,
    description: article?.excerpt ?? resource.description ?? undefined,
    image: article?.featured_image_url ?? resource.thumbnail_url ?? undefined,
    url: `${appUrl}/articles/${resource.slug}`,
    author: resource.author
      ? { '@type': 'Person', name: resource.author.display_name ?? resource.author.username }
      : undefined,
    datePublished: resource.published_at ?? undefined,
    dateModified: resource.updated_at,
    keywords: resource.tags.length > 0 ? resource.tags.join(', ') : undefined,
    inLanguage: resource.language,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}

interface ProfileJsonLdProps {
  profile: PublicProfile;
}

// Phase 4B (Part 10 — SEO Friendly public contributor page) — schema.org
// ProfilePage wrapping a Person, same safeJsonLdStringify escaping as
// ResourceJsonLd above.
export function ProfileJsonLd({ profile }: ProfileJsonLdProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const name = profile.display_name ?? profile.username;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name,
      alternateName: profile.username,
      description: profile.bio ?? profile.headline ?? undefined,
      image: profile.avatar_url ?? undefined,
      url: `${appUrl}/users/${profile.username}`,
      jobTitle: profile.headline ?? undefined,
      affiliation: profile.institution ? { '@type': 'Organization', name: profile.institution } : undefined,
      address: profile.location ?? undefined,
      sameAs: [
        profile.website_url,
        profile.github_url,
        profile.gitlab_url,
        profile.linkedin_url,
        profile.x_url,
        profile.scholar_url,
        profile.kaggle_url,
        profile.huggingface_url,
      ].filter(Boolean),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(jsonLd) }}
    />
  );
}
