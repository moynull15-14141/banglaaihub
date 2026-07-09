import type { ResourceCategory, ResourceLanguage, ResourceType } from './resource';

export type SearchSort = 'relevance' | 'newest' | 'popular';

export interface SearchResultAuthor {
  id: string;
  username: string;
  display_name: string | null;
  is_verified: boolean;
}

// Deliberately narrower than Resource — mirrors toSearchResultDto() in
// backend/src/services/search.service.ts exactly (no status, language,
// author avatar, or created/updated timestamps).
export interface SearchResult {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ResourceType;
  category: ResourceCategory | null;
  license: string | null;
  format: string | null;
  tags: string[];
  author: SearchResultAuthor | null;
  view_count: number;
  download_count: number;
  bookmark_count: number;
  published_at: string | null;
  thumbnail_url: string | null;
}

export interface SearchParams {
  q: string;
  type?: ResourceType;
  category?: string;
  language?: ResourceLanguage;
  sort?: SearchSort;
  // Phase 3B filters.
  license?: string;
  author?: string;
  verified?: true;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface SearchSuggestion {
  id: string;
  slug: string;
  title: string;
  type: ResourceType;
}

export interface PopularSearchEntry {
  query: string;
  count: number;
}

export interface LicenseFacet {
  license: string;
  count: number;
}
