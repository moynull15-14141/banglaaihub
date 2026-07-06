import { z } from 'zod';

// Matches doc 10's Dataset model (excludes file_url/checksum/benchmark_score,
// which are system-set during upload, not user-submitted).
export const datasetInputSchema = z.object({
  version: z.string().max(20).optional(),
  file_format: z.string().max(50).optional(),
  record_count: z.number().int().positive().optional(),
  annotation_type: z.string().max(100).optional(),
  domain: z.string().max(100).optional(),
  collection_year: z.number().int().min(1900).max(2100).optional(),
  data_source: z.string().optional(),
  methodology: z.string().optional(),
  parent_dataset_slug: z.string().optional(),
});
export type DatasetInput = z.infer<typeof datasetInputSchema>;
