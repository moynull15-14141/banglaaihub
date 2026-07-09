import { z } from 'zod';

// Matches doc 10's Prompt model.
const PROMPT_ROLES = ['system', 'developer', 'user'] as const;
const PROMPT_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

const promptVariableSchema = z.object({
  name: z.string().max(100),
  description: z.string().max(500).optional(),
  default_value: z.string().max(500).optional(),
});

export const promptInputSchema = z.object({
  role: z.enum(PROMPT_ROLES).optional(),
  content: z.string().min(1).max(20000),
  target_platforms: z.array(z.string().max(50)).max(20).optional(),
  variables: z.array(promptVariableSchema).max(50).optional(),
  difficulty: z.enum(PROMPT_DIFFICULTIES).optional(),
  example_output: z.string().max(10000).optional(),
  version: z.string().max(20).optional(),
  parent_prompt_slug: z.string().optional(),
});
export type PromptInput = z.infer<typeof promptInputSchema>;
