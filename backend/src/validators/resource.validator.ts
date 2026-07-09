import { z } from 'zod';
import { datasetInputSchema } from './dataset.validator';
import { paperInputSchema } from './paper.validator';
import { toolInputSchema } from './tool.validator';
import { modelInputSchema } from './model.validator';
import { promptInputSchema } from './prompt.validator';

// Full set per doc 10's ResourceType enum (doc 13's example schema only shows
// 5 of the 7 — dataset/paper/tool/tutorial/prompt — omitting project/news,
// which are still valid per the locked Prisma enum). `model` added Phase 3A.
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
const RESOURCE_STATUSES = ['pending', 'approved', 'rejected', 'flagged'] as const;
// Phase 3B — `trending`/`updated`/`alpha` added. `trending` is Prisma-only
// (resolveTrendingPage in resources.service.ts), not available on the
// MeiliSearch-backed /search endpoint (see search.validator.ts's own
// separate, smaller sort enum).
const SORT_OPTIONS = [
  'newest',
  'oldest',
  'popular',
  'downloads',
  'bookmarks',
  'trending',
  'updated',
  'alpha',
] as const;
const VISIBILITIES = ['public', 'unlisted', 'private'] as const;

// Comma-separated tag slugs, e.g. `?tags=bangla,llm` — mirrors how tags are
// already comma-separated everywhere else in this codebase's forms.
const commaSeparatedTags = z
  .string()
  .transform((value) => value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  .pipe(z.array(z.string().max(50)).max(10));

export const createResourceSchema = z.object({
  title: z.string().min(5).max(300).trim(),
  description: z.string().min(50).max(5000).trim().optional(),
  type: z.enum(RESOURCE_TYPES),
  category_id: z.number().int().positive().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  language: z.enum(LANGUAGES).optional(),
  license: z.string().max(100).optional(),
  external_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  visibility: z.enum(VISIBILITIES).optional(),
  dataset: datasetInputSchema.optional(),
  paper: paperInputSchema.optional(),
  tool: toolInputSchema.optional(),
  model: modelInputSchema.optional(),
  prompt: promptInputSchema.optional(),
});
export type CreateResourceInput = z.infer<typeof createResourceSchema>;

export const updateResourceSchema = createResourceSchema.partial();
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const listResourcesQuerySchema = z.object({
  type: z.enum(RESOURCE_TYPES).optional(),
  category: z.string().optional(),
  language: z.enum(LANGUAGES).optional(),
  status: z.enum(RESOURCE_STATUSES).optional(),
  sort: z.enum(SORT_OPTIONS).optional(),
  // Additive — lets the home page's "Featured resources" section fetch only
  // featured=true rows. Omitting the param behaves exactly as before.
  featured: z.literal('true').optional(),
  // Admin-only (enforced in the service, same pattern as `status` above) —
  // lists soft-deleted resources instead of live ones, so an admin with
  // resource:delete_any can find something to restore.
  deleted: z.literal('true').optional(),
  // Phase 3B filters.
  license: z.string().max(100).optional(),
  author: z.string().max(50).optional(),
  verified: z.literal('true').optional(),
  tags: commaSeparatedTags.optional(),
});
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

// POST /resources/:slug/upload?kind=... — mirrors
// contributor-application.validator.ts's addSampleFileQuerySchema exactly.
// `dataset` is the default so the pre-existing dataset-file upload call
// sites (which never sent `kind`) keep working unchanged.
export const uploadResourceFileQuerySchema = z.object({
  kind: z.enum(['dataset', 'thumbnail', 'pdf', 'asset', 'documentation', 'model']).default('dataset'),
});
export type UploadResourceFileQuery = z.infer<typeof uploadResourceFileQuerySchema>;

// POST /resources/:slug/attachments — optional display name override; the
// original filename is always kept as `filename` regardless.
export const addResourceAttachmentQuerySchema = z.object({
  display_name: z.string().min(1).max(255).trim().optional(),
});
export type AddResourceAttachmentQuery = z.infer<typeof addResourceAttachmentQuerySchema>;

// PATCH /resources/:slug/attachments/reorder — the full ordered list of file
// IDs for this resource (server verifies they all actually belong to it).
export const reorderResourceAttachmentsSchema = z.object({
  file_ids: z.array(z.string().uuid()).min(1).max(100),
});
export type ReorderResourceAttachmentsInput = z.infer<typeof reorderResourceAttachmentsSchema>;

// DELETE /resources/:slug (and the admin equivalent) — `force` requests a
// hard delete regardless of status; only honored when the actor holds
// resource:delete_any (checked in the service, not here).
export const deleteResourceQuerySchema = z.object({
  force: z.literal('true').optional(),
});
export type DeleteResourceQuery = z.infer<typeof deleteResourceQuerySchema>;

const REPORT_REASONS = ['spam', 'copyright', 'wrong_data', 'duplicate', 'inappropriate'] as const;

export const createReportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  description: z.string().max(2000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

// GET /resources/:slug/download?file_id= — omitted file_id means "the
// resource's legacy primary file" (dataset.file_url/tool.file_url/paper.pdf_url,
// the pre-existing single-slot behavior); a file_id targets one specific
// ResourceFile attachment instead. Analytics/download_count are recorded by
// the separate confirm call below, not by this one.
export const getDownloadUrlQuerySchema = z.object({
  file_id: z.string().uuid().optional(),
});
export type GetDownloadUrlQuery = z.infer<typeof getDownloadUrlQuerySchema>;

// POST /resources/:slug/download/confirm — called by the client once it has
// successfully obtained the signed URL and handed it to the browser; this is
// what actually increments download_count / writes the analytics event (see
// Part 5 — "log analytics only after successful download").
export const confirmDownloadQuerySchema = z.object({
  file_id: z.string().uuid().optional(),
});
export type ConfirmDownloadQuery = z.infer<typeof confirmDownloadQuerySchema>;

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  parent_id: z.number().int().positive().optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().extend({
  parent_id: z.number().int().positive().nullable().optional(),
});
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
