import { z } from 'zod';

export const duplicateCheckQuerySchema = z.object({
  field: z.enum(['title', 'seo_description', 'canonical_url']),
  value: z.string().min(1).max(500),
  exclude_slug: z.string().optional(),
});
export type DuplicateCheckQuery = z.infer<typeof duplicateCheckQuerySchema>;
