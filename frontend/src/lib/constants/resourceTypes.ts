import type { ResourceType, ToolType } from '@/types/resource';

// Mirrors the Prisma ResourceType enum exactly (doc 10) — the only 7 values
// that exist anywhere in the schema.
export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'paper', label: 'Paper' },
  { value: 'tool', label: 'Tool' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'project', label: 'Project' },
  { value: 'news', label: 'News' },
];

export const RESOURCE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RESOURCE_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
);

// Types that have their own metadata table (Dataset/Paper/Tool) — every
// other type is intentionally base-Resource-only per doc 10.
export const RESOURCE_TYPES_WITH_METADATA = new Set<ResourceType>(['dataset', 'paper', 'tool']);

export const LANGUAGE_OPTIONS: { value: 'bn' | 'en' | 'both'; label: string }[] = [
  { value: 'bn', label: 'Bangla' },
  { value: 'en', label: 'English' },
  { value: 'both', label: 'Both' },
];

// Mirrors the Prisma ToolType enum (doc 10's `tool_type` column comment).
export const TOOL_TYPE_OPTIONS: { value: ToolType; label: string }[] = [
  { value: 'library', label: 'Library' },
  { value: 'api', label: 'API' },
  { value: 'model', label: 'Model' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'tutorial', label: 'Tutorial' },
];
