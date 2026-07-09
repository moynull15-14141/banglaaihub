import { prisma } from '../config/database';
import { meilisearchClient, RESOURCES_INDEX_UID } from '../config/meilisearch';
import { resourceInclude, type ResourceWithRelations } from './resources.service';
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
  tags: string[];
  author_id: string | null;
  author_name: string | null;
  author_display_name: string | null;
  view_count: number;
  download_count: number;
  bookmark_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
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
    tags: resource.resourceTags.map((rt) => rt.tag.name),
    author_id: resource.author?.id ?? null,
    author_name: resource.author?.username ?? null,
    author_display_name: resource.author?.displayName ?? null,
    view_count: resource.viewCount,
    download_count: resource.downloadCount,
    bookmark_count: resource.bookmarkCount,
    published_at: resource.publishedAt?.toISOString() ?? null,
    created_at: resource.createdAt.toISOString(),
    updated_at: resource.updatedAt.toISOString(),
    thumbnail_url: resource.thumbnailUrl,
  };
}

function toSearchResultDto(doc: SearchDocument): Record<string, unknown> {
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    type: doc.type,
    category: doc.category_id
      ? { id: doc.category_id, name: doc.category_name, slug: doc.category_slug }
      : null,
    tags: doc.tags,
    author: doc.author_id
      ? { id: doc.author_id, username: doc.author_name, display_name: doc.author_display_name }
      : null,
    view_count: doc.view_count,
    download_count: doc.download_count,
    bookmark_count: doc.bookmark_count,
    published_at: doc.published_at,
    thumbnail_url: doc.thumbnail_url,
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
      return undefined; // MeiliSearch's own relevance ranking.
  }
}

export class SearchService {
  private static get index() {
    return meilisearchClient.index<SearchDocument>(RESOURCES_INDEX_UID);
  }

  static async configureIndex(): Promise<void> {
    await this.index.updateSettings({
      searchableAttributes: ['title', 'description', 'tags', 'author_name', 'category_name'],
      filterableAttributes: ['type', 'status', 'language', 'category_id', 'license', 'format'],
      sortableAttributes: [
        'view_count',
        'download_count',
        'bookmark_count',
        'published_at',
        'created_at',
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

    await this.index.addDocuments([toSearchDocument(resource)]);
  }

  static async updateResource(resource: ResourceWithRelations): Promise<void> {
    await this.indexResource(resource);
  }

  static async deleteResource(resourceId: string): Promise<void> {
    await this.index.deleteDocument(resourceId);
  }

  static async rebuildIndex(): Promise<{ count: number }> {
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
  ): Promise<{
    data: unknown[];
    meta: { total: number; page: number; limit: number; hasNextPage: boolean };
  }> {
    const filters: string[] = ['status = approved'];
    if (query.type) filters.push(`type = ${query.type}`);
    if (query.language) filters.push(`language = ${query.language}`);

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

    return {
      data: finiteResponse.hits.map(toSearchResultDto),
      meta: {
        total: finiteResponse.totalHits,
        page: finiteResponse.page,
        limit: finiteResponse.hitsPerPage,
        hasNextPage: finiteResponse.page * finiteResponse.hitsPerPage < finiteResponse.totalHits,
      },
    };
  }
}
