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
// resources-list endpoint's sort options (newest/popular/downloads/bookmarks).
const SEARCH_SORT_OPTIONS = ['relevance', 'newest', 'popular'] as const;

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'A search query is required.'),
  type: z.enum(RESOURCE_TYPES).optional(),
  category: z.string().optional(),
  language: z.enum(LANGUAGES).optional(),
  sort: z.enum(SEARCH_SORT_OPTIONS).optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
