import { z } from 'zod';

// Matches doc 10's Model model (excludes file_url/file_size_bytes/checksum_sha256,
// which are system-set during upload, not user-submitted).
const MODEL_FORMATS = [
  'gguf',
  'safetensors',
  'onnx',
  'pytorch',
  'tensorflow',
  'mlx',
  'lora',
  'adapter',
  'other',
] as const;

export const modelInputSchema = z.object({
  architecture: z.string().max(200).optional(),
  base_model: z.string().max(200).optional(),
  format: z.enum(MODEL_FORMATS).optional(),
  quantization: z.string().max(100).optional(),
  context_length: z.number().int().positive().optional(),
  parameters: z.string().max(50).optional(),
  precision: z.string().max(50).optional(),
  gpu_requirement: z.string().optional(),
  ram_requirement: z.string().optional(),
  benchmark_score: z.record(z.string(), z.unknown()).optional(),
  inference_example: z.string().optional(),
  version: z.string().max(20).optional(),
  changelog: z.string().optional(),
  demo_url: z.string().url().optional(),
  repository_url: z.string().url().optional(),
  paper_url: z.string().url().optional(),
  parent_model_slug: z.string().optional(),
});
export type ModelInput = z.infer<typeof modelInputSchema>;
