import type { Resource } from '@/types/resource';

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
