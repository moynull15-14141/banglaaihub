import { z } from 'zod';

// Matches doc 10's ResourceType enum exactly (same set used in resource.validator.ts).
const RESOURCE_TYPES = [
  'dataset',
  'paper',
  'tool',
  'tutorial',
  'prompt',
  'project',
  'news',
  'model',
] as const;
const LANGUAGES = ['bn', 'en', 'both'] as const;
// doc 11's search sort vocabulary — a smaller, distinct set from the
// resources-list endpoint's sort options (newest/popular/downloads/bookmarks/
// trending/updated/alpha) — "trending" is deliberately not included here,
// see search.service.ts's resolveSort() comment for why.
const SEARCH_SORT_OPTIONS = ['relevance', 'newest', 'popular'] as const;

const commaSeparatedTags = z
  .string()
  .transform((value) => value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  .pipe(z.array(z.string().max(50)).max(10));

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'A search query is required.'),
  type: z.enum(RESOURCE_TYPES).optional(),
  category: z.string().optional(),
  language: z.enum(LANGUAGES).optional(),
  sort: z.enum(SEARCH_SORT_OPTIONS).optional(),
  // Phase 3B filters.
  license: z.string().max(100).optional(),
  author: z.string().max(50).optional(),
  verified: z.literal('true').optional(),
  tags: commaSeparatedTags.optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

// GET /search/suggest — autocomplete, query text only.
export const suggestQuerySchema = z.object({
  q: z.string().min(1).max(300),
});
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

// GET /search/popular — window size in days, defaults applied in the service.
export const popularSearchesQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});
export type PopularSearchesQuery = z.infer<typeof popularSearchesQuerySchema>;
