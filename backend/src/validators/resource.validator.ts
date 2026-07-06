import { z } from 'zod';
import { datasetInputSchema } from './dataset.validator';

// Full set per doc 10's ResourceType enum (doc 13's example schema only shows
// 5 of the 7 — dataset/paper/tool/tutorial/prompt — omitting project/news,
// which are still valid per the locked Prisma enum).
const RESOURCE_TYPES = [
  'dataset',
  'paper',
  'tool',
  'tutorial',
  'prompt',
  'project',
  'news',
] as const;
const LANGUAGES = ['bn', 'en', 'both'] as const;
const RESOURCE_STATUSES = ['pending', 'approved', 'rejected', 'flagged'] as const;
const SORT_OPTIONS = ['newest', 'popular', 'downloads', 'bookmarks'] as const;

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
  dataset: datasetInputSchema.optional(),
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
});
export type ListResourcesQuery = z.infer<typeof listResourcesQuerySchema>;

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
