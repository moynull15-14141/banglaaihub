import type { ModelFormat, PromptDifficulty, PromptRole, ResourceType, ToolType } from '@/types/resource';

// Mirrors the Prisma ResourceType enum exactly (doc 10) — the only 8 values
// that exist anywhere in the schema (`model` added Phase 3A).
export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'dataset', label: 'Dataset' },
  { value: 'paper', label: 'Paper' },
  { value: 'tool', label: 'Tool' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'prompt', label: 'Prompt' },
  { value: 'project', label: 'Project' },
  { value: 'news', label: 'News' },
  { value: 'model', label: 'Model' },
];

export const RESOURCE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RESOURCE_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
);

// Types that have their own metadata table (Dataset/Paper/Tool/Model/Prompt)
// — every other type is intentionally base-Resource-only per doc 10.
export const RESOURCE_TYPES_WITH_METADATA = new Set<ResourceType>([
  'dataset',
  'paper',
  'tool',
  'model',
  'prompt',
]);

// Mirrors the Prisma ModelFormat enum (doc 10's `models.format` column).
export const MODEL_FORMAT_OPTIONS: { value: ModelFormat; label: string }[] = [
  { value: 'gguf', label: 'GGUF' },
  { value: 'safetensors', label: 'Safetensors' },
  { value: 'onnx', label: 'ONNX' },
  { value: 'pytorch', label: 'PyTorch' },
  { value: 'tensorflow', label: 'TensorFlow' },
  { value: 'mlx', label: 'MLX' },
  { value: 'lora', label: 'LoRA' },
  { value: 'adapter', label: 'Adapter' },
  { value: 'other', label: 'Other' },
];

// Mirrors the Prisma PromptRole enum (doc 10's `prompts.role` column).
export const PROMPT_ROLE_OPTIONS: { value: PromptRole; label: string }[] = [
  { value: 'system', label: 'System Prompt' },
  { value: 'developer', label: 'Developer Prompt' },
  { value: 'user', label: 'User Prompt' },
];

// Mirrors the Prisma PromptDifficulty enum (doc 10's `prompts.difficulty` column).
export const PROMPT_DIFFICULTY_OPTIONS: { value: PromptDifficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// Suggested target-platform options for the Prompt Hub — target_platforms is
// a free-text string[] in the schema (doc 10), so these are hints for the UI
// only, not a closed set enforced server-side.
export const PROMPT_PLATFORM_SUGGESTIONS = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'DeepSeek',
  'Qwen',
  'Cursor',
  'VS Code',
  'Midjourney',
  'Flux',
  'Stable Diffusion',
];

// Extracted from ResourceCard.tsx (Phase 3A.1) so VersionHistorySection can
// render the same status badge without duplicating the map.
export const STATUS_BADGE_VARIANT: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  flagged: 'destructive',
};

export const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  flagged: 'Flagged',
};

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
  model: '.json,.txt,.md,.safetensors,.gguf',
};

export const RESOURCE_ATTACHMENT_HINT_BY_TYPE: Record<ResourceType, string> = {
  dataset: 'CSV, JSON, Parquet, ZIP, TAR, GZIP — up to 500MB each',
  paper: 'PDF — up to 50MB each',
  tool: 'ZIP, 7Z, TAR, GZIP — up to 200MB each',
  tutorial: 'PDF, DOCX, PPTX, ZIP, Markdown — up to 100MB each',
  prompt: 'TXT, JSON, Markdown, PDF — up to 10MB each',
  project: 'ZIP, PDF, DOCX, PPTX — up to 200MB each',
  news: 'PDF, JPG, PNG — up to 20MB each',
  model: 'JSON, TXT, Markdown, Safetensors, GGUF — up to 2GB each',
};

// Primary model weight file (`kind=model` upload) — mirrors DATASET_FILE_ACCEPT
// in SubmitResourceView.tsx. Server enforces this regardless (StorageService's
// MODEL_ALLOWED_EXTENSIONS/MODEL_MAX_FILE_SIZE), same discipline as every
// other single-slot file field.
export const MODEL_FILE_ACCEPT = '.gguf,.safetensors,.onnx,.pt,.bin';
export const MODEL_FILE_HINT = 'GGUF, Safetensors, ONNX, PyTorch, BIN — up to 2GB';
