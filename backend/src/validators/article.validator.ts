import { z } from 'zod';

// Matches the Article extension table's ArticleContentType enum — the
// internal CMS taxonomy for the `article` ResourceType, distinct from the
// legacy bare `tutorial`/`news`/`project` ResourceType values.
const ARTICLE_CONTENT_TYPES = [
  'article',
  'tutorial',
  'guide',
  'news',
  'announcement',
  'editorial',
  'interview',
  'release_notes',
  'opinion',
  'case_study',
  'community_update',
] as const;

// `body` is intentionally optional here — drafts may be empty. It's required
// at publish time instead (see publishArticleSchema's usage in the service).
export const articleInputSchema = z.object({
  excerpt: z.string().max(500).optional(),
  body: z.string().max(200000).optional(),
  content_type: z.enum(ARTICLE_CONTENT_TYPES).optional(),
  featured_image_url: z.string().url().optional(),
  social_image_url: z.string().url().optional(),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(200).optional(),
  canonical_url: z.string().url().optional(),
  // Phase 5A-2 (SEO Engine).
  focus_keyword: z.string().max(100).optional(),
  meta_keywords: z.string().max(300).optional(),
  featured_image_alt: z.string().max(200).optional(),
  allow_comments: z.boolean().optional(),
  allow_reactions: z.boolean().optional(),
  allow_sharing: z.boolean().optional(),
  // Phase 5A-3 (Editorial Workflow) — an editor's optional note on what this
  // save changed, stored on the resulting ArticleRevision, never on Article
  // itself (see resources.service.ts's update() -> ArticleRevisionService.snapshot()).
  revision_summary: z.string().max(500).optional(),
});
export type ArticleInput = z.infer<typeof articleInputSchema>;

// POST /resources/:slug/publish — body is empty for "publish now", or
// scheduled_at for a future publish time (handled by the scheduled-publish
// job in scheduledPublish.job.ts).
export const publishArticleSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  // Phase 5A-3 — bypasses the Publish Checklist gate; only honored
  // server-side for admin-tier actors (see resources.service.ts's
  // publishArticle()), regardless of what a non-admin client sends.
  override: z.boolean().optional(),
});
export type PublishArticleInput = z.infer<typeof publishArticleSchema>;
