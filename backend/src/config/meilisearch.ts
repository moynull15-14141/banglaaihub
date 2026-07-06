import { Meilisearch } from 'meilisearch';
import { env } from './env';

export const RESOURCES_INDEX_UID = 'resources';

// A single server-side client is used for both indexing and searching —
// MeiliSearch is never queried directly from the frontend (search is always
// proxied through our own /search endpoint), so there's no need to split
// admin vs. search-only keys the way doc 13 does for JWTs.
export const meilisearchClient = new Meilisearch({
  host: env.MEILISEARCH_HOST,
  apiKey: env.MEILISEARCH_ADMIN_KEY,
});
