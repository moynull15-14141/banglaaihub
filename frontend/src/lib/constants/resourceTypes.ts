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

// Mirrors backend/src/services/storage.service.ts's
// RESOURCE_ATTACHMENT_EXTENSIONS_BY_TYPE / _MAX_FILE_SIZE_BY_TYPE (doc 10
// table 22) — kept in sync manually, same as DATASET_FILE_ACCEPT in
// SubmitResourceView.tsx, since the server enforces this regardless of what
// the client hints at. Every type gets attachment support, including
// tutorial/prompt/project/news, which have no legacy single-slot file field.
export const RESOURCE_ATTACHMENT_ACCEPT_BY_TYPE: Record<ResourceType, string> = {
  dataset: '.csv,.json,.parquet,.zip,.tar,.gz',
  paper: '.pdf',
  tool: '.zip,.7z,.tar,.gz',
  tutorial: '.pdf,.docx,.pptx,.zip,.md',
  prompt: '.txt,.json,.md,.pdf',
  project: '.zip,.pdf,.docx,.pptx',
  news: '.pdf,.jpg,.jpeg,.png',
};

export const RESOURCE_ATTACHMENT_HINT_BY_TYPE: Record<ResourceType, string> = {
  dataset: 'CSV, JSON, Parquet, ZIP, TAR, GZIP — up to 500MB each',
  paper: 'PDF — up to 50MB each',
  tool: 'ZIP, 7Z, TAR, GZIP — up to 200MB each',
  tutorial: 'PDF, DOCX, PPTX, ZIP, Markdown — up to 100MB each',
  prompt: 'TXT, JSON, Markdown, PDF — up to 10MB each',
  project: 'ZIP, PDF, DOCX, PPTX — up to 200MB each',
  news: 'PDF, JPG, PNG — up to 20MB each',
};
