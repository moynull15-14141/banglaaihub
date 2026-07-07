import { z } from 'zod';

// Matches doc 10's `tool_type` comment exactly — the same set the Prisma
// ToolType enum locks in.
const TOOL_TYPES = ['library', 'api', 'model', 'prompt', 'tutorial'] as const;

// Matches doc 10's Tool model.
export const toolInputSchema = z.object({
  tool_type: z.enum(TOOL_TYPES).optional(),
  platform: z.string().max(100).optional(),
  demo_url: z.string().url().optional(),
  install_command: z.string().optional(),
});
export type ToolInput = z.infer<typeof toolInputSchema>;
