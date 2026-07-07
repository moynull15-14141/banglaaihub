import { z } from 'zod';

// Matches doc 10's Paper model (excludes citation_count, which accrues over
// time from external sources rather than being user-submitted at creation).
export const paperInputSchema = z.object({
  abstract: z.string().max(5000).optional(),
  authors: z.array(z.string().max(200)).max(50).optional(),
  venue: z.string().max(200).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  doi: z.string().max(200).optional(),
  arxiv_id: z.string().max(50).optional(),
  pdf_url: z.string().url().optional(),
  code_url: z.string().url().optional(),
});
export type PaperInput = z.infer<typeof paperInputSchema>;
