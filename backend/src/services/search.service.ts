import { prisma } from '../config/database';
import { meilisearchClient, RESOURCES_INDEX_UID } from '../config/meilisearch';
import { resourceInclude, type ResourceWithRelations } from './resources.service';
import { StorageService } from './storage.service';
import type { PaginationParams } from '../utils/pagination';
import type { SearchQuery } from '../validators/search.validator';

// Search document shape — built exactly from doc 10's MeiliSearch Index
// Structure (searchableAttributes/filterableAttributes/sortableAttributes),
// plus a handful of extra display-only fields (slug, thumbnail_url, ids)
// needed to render a result the same way a regular resource list item is
// rendered. None of the extra fields are added to any attribute config list,
// so nothing beyond doc 10's spec is actually searchable/filterable/sortable.
export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  language: string;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  license: string | null;
  // Model Hub (Phase 3A) — sourced from resource.model.format, null for
  // every other resource type. Kept as a top-level field (rather than a
  // deeper nested one) since MeiliSearch's filterableAttributes only
  // supports flat document fields.
  format: string | null;
  // Phase 5A-1 (Content Platform) — sourced from resource.article, null for
  // every other resource type. Same flat-field reasoning as `format` above.
  content_type: string | null;
  excerpt: string | null;
  reading_time_minutes: number | null;
  tags: string[];
  author_id: string | null;
  author_name: string | null;
  author_display_name: string | null;
  // Phase 3B — powers the "verified author" filter.
  author_is_verified: boolean;
  view_count: number;
  download_count: number;
  bookmark_count: number;
  avg_rating: number | null;
  review_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
  // Paid Resource Downloads — is_free is a derived boolean (price_cents is
  // null/0) kept as its own filterable field since MeiliSearch filters read
  // more naturally as `is_free = true` than `price_cents = 0`.
  is_free: boolean;
  price_cents: number | null;
  currency: string | null;
}

function toSearchDocument(resource: ResourceWithRelations): SearchDocument {
  return {
    id: resource.id,
    slug: resource.slug,
    title: resource.title,
    description: resource.description,
    type: resource.type,
    status: resource.status,
    language: resource.language,
    category_id: resource.category?.id ?? null,
    category_name: resource.category?.name ?? null,
    category_slug: resource.category?.slug ?? null,
    license: resource.license,
    format: resource.model?.format ?? null,
    content_type: resource.article?.contentType ?? null,
    excerpt: resource.article?.excerpt ?? null,
    reading_time_minutes: resource.article?.readingTimeMinutes ?? null,
    tags: resource.resourceTags.map((rt) => rt.tag.name),
    author_id: resource.author?.id ?? null,
    author_name: resource.author?.username ?? null,
    author_display_name: resource.author?.displayName ?? null,
    author_is_verified: resource.author?.isVerified ?? false,
    view_count: resource.viewCount,
    download_count: resource.downloadCount,
    bookmark_count: resource.bookmarkCount,
    avg_rating: resource.avgRating,
    review_count: resource.reviewCount,
    published_at: resource.publishedAt?.toISOString() ?? null,
    created_at: resource.createdAt.toISOString(),
    updated_at: resource.updatedAt.toISOString(),
    thumbnail_url: resource.thumbnailUrl,
    is_free: !resource.priceCents,
    price_cents: resource.priceCents,
    currency: resource.currency,
  };
}

// The index stores Resource.thumbnailUrl's raw value as-is (R2 key or
// external URL, see toSearchDocument above) — a signed URL would go stale
// before the next reindex, so it's resolved here at read time instead, same
// as UserSearchService.search() already does for avatar_url.
async function toSearchResultDto(doc: SearchDocument): Promise<Record<string, unknown>> {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    category: doc.category_id
      ? { id: doc.category_id, name: doc.category_name, slug: doc.category_slug }
      : null,
    license: doc.license,
    format: doc.format,
    content_type: doc.content_type,
    excerpt: doc.excerpt,
    reading_time_minutes: doc.reading_time_minutes,
    tags: doc.tags,
    author: doc.author_id
      ? {
          id: doc.author_id,
          username: doc.author_name,
          display_name: doc.author_display_name,
          is_verified: doc.author_is_verified,
        }
      : null,
    view_count: doc.view_count,
    download_count: doc.download_count,
    bookmark_count: doc.bookmark_count,
    avg_rating: doc.avg_rating,
    review_count: doc.review_count,
    published_at: doc.published_at,
    thumbnail_url: await StorageService.resolveUrl(doc.thumbnail_url),
    price_cents: doc.price_cents,
    currency: doc.currency,
  };
}

function resolveSort(sort?: string): string[] | undefined {
  switch (sort) {
    case 'newest':
      return ['created_at:desc'];
    // "popular" mirrors the resources-list endpoint's own "popular" mapping
    // (view_count desc) from Phase 4, for consistency across both endpoints.
    case 'popular':
      return ['view_count:desc'];
    default:
      return undefined; // MeiliSearch's own relevance ranking. "trending" is
    // deliberately not handled here — it's Prisma-only (see
    // resources.service.ts), since blending it with MeiliSearch relevance
    // ranking would need a periodically-synced score field in the index.
  }
}

// User-supplied values (license/author/tags) are interpolated directly into
// a MeiliSearch filter expression string — escape quotes/backslashes so a
// value can never break out of its quoted literal and inject additional
// filter clauses.
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export class SearchService {
  private static get index() {
    return meilisearchClient.index<SearchDocument>(RESOURCES_INDEX_UID);
  }

  // Phase 3B fix — SearchDocument has three fields ending in "id" (id,
  // author_id, category_id), so MeiliSearch's automatic primary-key
  // inference fails with index_primary_key_multiple_candidates_found on
  // first write, silently dropping every document (addDocuments enqueues a
  // task that fails asynchronously — the HTTP call itself returns success).
  // Creating the index with an explicit primaryKey up front avoids inference
  // entirely; index_already_exists is expected and ignored on every call
  // after the first.
  private static async ensureIndexExists(): Promise<void> {
    try {
      await meilisearchClient.createIndex(RESOURCES_INDEX_UID, { primaryKey: 'id' }).waitTask();
    } catch (error) {
      const code = (error as { cause?: { code?: string } } | undefined)?.cause?.code;
      if (code !== 'index_already_exists') {
        throw error;
      }
    }
  }

  static async configureIndex(): Promise<void> {
    await this.ensureIndexExists();
    await this.index.updateSettings({
      searchableAttributes: ['title', 'description', 'excerpt', 'tags', 'author_name', 'category_name'],
      filterableAttributes: [
        'type',
        'status',
        'language',
        'category_id',
        'license',
        'format',
        'content_type',
        'tags',
        'author_name',
        'author_is_verified',
        'is_free',
      ],
      sortableAttributes: [
        'view_count',
        'download_count',
        'bookmark_count',
        'avg_rating',
        'review_count',
        'published_at',
        'created_at',
        'updated_at',
      ],
    });
  }

  // MeiliSearch's addDocuments() upserts by primaryKey, so indexResource() and
  // updateResource() are functionally identical at the MeiliSearch level —
  // kept as two named methods because the calling code (ResourceService)
  // reads more clearly at each call site about *why* a sync is happening.
  static async indexResource(resource: ResourceWithRelations): Promise<void> {
    if (resource.status !== 'approved' || resource.deletedAt) {
      await this.deleteResource(resource.id);
      return;
    }

    // Realtime indexing (create/update/approve) can run before anyone has
    // ever called configureIndex() in this environment — ensure the index
    // (and its primary key) exists rather than relying on inference.
    await this.ensureIndexExists();
    await this.index.addDocuments([toSearchDocument(resource)]);
  }

  static async updateResource(resource: ResourceWithRelations): Promise<void> {
    await this.indexResource(resource);
  }

  static async deleteResource(resourceId: string): Promise<void> {
    await this.ensureIndexExists();
    await this.index.deleteDocument(resourceId);
  }

  static async rebuildIndex(): Promise<{ count: number }> {
    await this.ensureIndexExists();

    const resources = await prisma.resource.findMany({
      where: { status: 'approved', deletedAt: null },
      include: resourceInclude,
    });

    await this.index.deleteAllDocuments();
    if (resources.length > 0) {
      await this.index.addDocuments(resources.map(toSearchDocument));
    }

    return { count: resources.length };
  }

  static async search(
    query: SearchQuery,
    pagination: PaginationParams,
    userId?: string,
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; hasNextPage: boolean };
  }> {
    // Querying an index that doesn't exist yet (e.g. a fresh Meilisearch
    // Cloud instance before the first rebuild-index call) throws
    // index_not_found and previously 500'd the whole search page — this
    // guarantees the (possibly empty) index exists first, same fix as
    // indexResource()'s own ensureIndexExists() call below.
    await this.ensureIndexExists();

    const filters: string[] = ['status = approved'];
    if (query.type) filters.push(`type = ${query.type}`);
    if (query.language) filters.push(`language = ${query.language}`);
    if (query.license) filters.push(`license = "${escapeFilterValue(query.license)}"`);
    // Exact match on username — a partial/fuzzy author filter would need
    // author_name in searchableAttributes combined with a second query,
    // which conflates "search for X" with "filter by author X"; kept as an
    // exact filter for now, same tradeoff noted in resources.service.ts's
    // list() (which does a `contains` there, on the Postgres-backed path —
    // documented inconsistency, not an oversight).
    if (query.author) filters.push(`author_name = "${escapeFilterValue(query.author)}"`);
    if (query.verified) filters.push('author_is_verified = true');
    if (query.tags && query.tags.length > 0) {
      filters.push(`(${query.tags.map((tag) => `tags = "${escapeFilterValue(tag)}"`).join(' OR ')})`);
    }
    if (query.pricing === 'free') filters.push('is_free = true');
    if (query.pricing === 'paid') filters.push('is_free = false');

    // doc 10's filterableAttributes only includes category_id (not a slug) —
    // the query param is a human-readable slug (per doc 11's example
    // "category = nlp"), so it's resolved to an id before filtering, same as
    // the resources-list endpoint already does in Phase 4.
    if (query.category) {
      const category = await prisma.category.findUnique({
        where: { slug: query.category },
        select: { id: true },
      });
      // An unknown category slug should yield zero results, not an unfiltered
      // search — -1 can never match a real category_id.
      filters.push(`category_id = ${category?.id ?? -1}`);
    }

    // Passing page/hitsPerPage (rather than offset/limit) puts MeiliSearch in
    // its "finite pagination" response mode: {hits, totalHits, page, hitsPerPage, totalPages}.
    const response = await this.index.search(query.q, {
      filter: filters.join(' AND '),
      sort: resolveSort(query.sort),
      page: pagination.page,
      hitsPerPage: pagination.limit,
    });
    const finiteResponse = response as typeof response & {
      totalHits: number;
      page: number;
      hitsPerPage: number;
    };

    const result = {
      data: await Promise.all(finiteResponse.hits.map(toSearchResultDto)),
      meta: {
        total: finiteResponse.totalHits,
        page: finiteResponse.page,
        limit: finiteResponse.hitsPerPage,
        hasNextPage: finiteResponse.page * finiteResponse.hitsPerPage < finiteResponse.totalHits,
      },
    };

    void this.logSearch(query, finiteResponse.totalHits, userId);

    return result;
  }

  // Lightweight autocomplete — reuses the same index, a small hit count and a
  // narrow field set (no description/tags needed for a dropdown suggestion).
  static async suggest(q: string): Promise<{ id: string; slug: string; title: string; type: string }[]> {
    if (!q.trim()) return [];
    await this.ensureIndexExists();

    const response = await this.index.search(q, {
      filter: 'status = approved',
      limit: 6,
      attributesToRetrieve: ['id', 'slug', 'title', 'type'],
    });

    return response.hits.map((hit) => ({
      id: hit.id,
      slug: hit.slug,
      title: hit.title,
      type: hit.type,
    }));
  }

  // Facet distribution for the license filter dropdown — real, currently-in-
  // use values, not a hardcoded list that drifts from what's actually there.
  static async getLicenseFacets(): Promise<{ license: string; count: number }[]> {
    await this.ensureIndexExists();
    const response = await this.index.search('', {
      filter: 'status = approved',
      facets: ['license'],
      limit: 0,
    });
    const distribution = response.facetDistribution?.license ?? {};
    return Object.entries(distribution)
      .filter(([license]) => license)
      .map(([license, count]) => ({ license, count }))
      .sort((a, b) => b.count - a.count);
  }

  // Fire-and-forget, same best-effort pattern as syncSearchIndex in
  // resources.service.ts — a logging failure must never fail the search
  // request it's attached to.
  private static async logSearch(query: SearchQuery, resultCount: number, userId?: string): Promise<void> {
    try {
      await prisma.searchLog.create({
        data: {
          query: query.q.slice(0, 300),
          resultCount,
          filters: {
            type: query.type ?? null,
            category: query.category ?? null,
            language: query.language ?? null,
            license: query.license ?? null,
            tags: query.tags ?? null,
            author: query.author ?? null,
            verified: query.verified ?? null,
            sort: query.sort ?? null,
          },
          userId: userId ?? null,
        },
      });
    } catch {
      // Best-effort only — never surfaces to the caller.
    }
  }

  // Popular searches — query text grouped/counted within a recent window.
  // The same endpoint also serves "trending searches" via a narrower `days`
  // value from the caller; not a separate concept or code path.
  static async getPopularSearches(days = 7, limit = 10): Promise<{ query: string; count: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const grouped = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: since }, query: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { query: 'desc' } },
      take: limit,
    });
    return grouped.map((row) => ({ query: row.query, count: row._count._all }));
  }

  // Admin search-analytics summary — top queries + no-result queries, both
  // sourced from the same search_logs table.
  static async getSearchAnalyticsSummary(days = 7): Promise<{
    total_searches: number;
    top_queries: { query: string; count: number }[];
    no_result_queries: { query: string; count: number }[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalSearches, topQueries, noResultQueries] = await Promise.all([
      prisma.searchLog.count({ where: { createdAt: { gte: since } } }),
      prisma.searchLog.groupBy({
        by: ['query'],
        where: { createdAt: { gte: since }, query: { not: '' } },
        _count: { _all: true },
        orderBy: { _count: { query: 'desc' } },
        take: 20,
      }),
      prisma.searchLog.groupBy({
        by: ['query'],
        where: { createdAt: { gte: since }, resultCount: 0, query: { not: '' } },
        _count: { _all: true },
        orderBy: { _count: { query: 'desc' } },
        take: 20,
      }),
    ]);

    return {
      total_searches: totalSearches,
      top_queries: topQueries.map((row) => ({ query: row.query, count: row._count._all })),
      no_result_queries: noResultQueries.map((row) => ({ query: row.query, count: row._count._all })),
    };
  }
}
