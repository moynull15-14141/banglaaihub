export type ResourceType =
  | 'dataset'
  | 'paper'
  | 'tool'
  | 'tutorial'
  | 'prompt'
  | 'project'
  | 'news'
  | 'model';

export type ResourceLanguage = 'bn' | 'en' | 'both';
export type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ResourceVisibility = 'public' | 'unlisted' | 'private';
export type ResourceSort = 'newest' | 'oldest' | 'popular' | 'downloads' | 'bookmarks';
export type ToolType = 'library' | 'api' | 'model' | 'prompt' | 'tutorial';
export type ModelFormat =
  | 'gguf'
  | 'safetensors'
  | 'onnx'
  | 'pytorch'
  | 'tensorflow'
  | 'mlx'
  | 'lora'
  | 'adapter'
  | 'other';
export type PromptRole = 'system' | 'developer' | 'user';
export type PromptDifficulty = 'beginner' | 'intermediate' | 'advanced';

// A ResourceFile row (Phase 2.3) — a universal, multi-file attachment,
// separate from (and additional to) each type's single-slot field
// (dataset.file_url/paper.pdf_url/tool.file_url).
export interface ResourceAttachment {
  id: string;
  filename: string;
  display_name: string;
  mime_type: string;
  extension: string;
  size_bytes: string;
  checksum_sha256: string;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_at: string;
  url: string;
}

export interface ResourceAuthor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ResourceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ResourceApprover {
  id: string;
  username: string;
  display_name: string | null;
}

export interface DatasetMetadata {
  version: string;
  file_url: string | null;
  file_size_bytes: string | null;
  file_format: string | null;
  record_count: number | null;
  annotation_type: string | null;
  domain: string | null;
  collection_year: number | null;
  data_source: string | null;
  methodology: string | null;
  checksum_sha256: string | null;
  parent_id: string | null;
}

export interface PaperMetadata {
  abstract: string | null;
  authors: string[];
  venue: string | null;
  year: number | null;
  doi: string | null;
  arxiv_id: string | null;
  pdf_url: string | null;
  code_url: string | null;
  citation_count: number;
}

export interface ToolMetadata {
  tool_type: ToolType | null;
  platform: string | null;
  demo_url: string | null;
  install_command: string | null;
  file_url: string | null;
  file_size_bytes: string | null;
  checksum_sha256: string | null;
}

export interface ModelMetadata {
  architecture: string | null;
  base_model: string | null;
  format: ModelFormat | null;
  quantization: string | null;
  context_length: number | null;
  parameters: string | null;
  precision: string | null;
  gpu_requirement: string | null;
  ram_requirement: string | null;
  benchmark_score: Record<string, unknown> | null;
  inference_example: string | null;
  version: string;
  changelog: string | null;
  demo_url: string | null;
  repository_url: string | null;
  paper_url: string | null;
  file_url: string | null;
  file_size_bytes: string | null;
  checksum_sha256: string | null;
  parent_id: string | null;
}

export interface PromptVariable {
  name: string;
  description?: string;
  default_value?: string;
}

export interface PromptMetadata {
  role: PromptRole;
  content: string;
  target_platforms: string[];
  variables: PromptVariable[] | null;
  difficulty: PromptDifficulty | null;
  example_output: string | null;
  version: string;
  parent_id: string | null;
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ResourceType;
  status: ResourceStatus;
  visibility: ResourceVisibility;
  language: ResourceLanguage;
  license: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  documentation_url: string | null;
  attachments: ResourceAttachment[];
  attachment_count: number;
  author: ResourceAuthor | null;
  category: ResourceCategory | null;
  tags: string[];
  view_count: number;
  download_count: number;
  bookmark_count: number;
  featured: boolean;
  approved_by: ResourceApprover | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Only ever non-null when fetched via the admin "Deleted" moderation tab —
  // every other list/detail endpoint filters deletedAt out server-side.
  deleted_at: string | null;
  // Only ever present when fetched via GET /resources/:slug (for the
  // authenticated requester) or GET /users/me/bookmarks (always true there)
  // — omitted (undefined) from plain listing endpoints, not computed there.
  is_bookmarked?: boolean;
  // Only present on GET /users/me/bookmarks — when the bookmark itself was
  // created, not the resource.
  bookmarked_at?: string;
  dataset: DatasetMetadata | null;
  paper: PaperMetadata | null;
  tool: ToolMetadata | null;
  model: ModelMetadata | null;
  prompt: PromptMetadata | null;
}

// Mirrors backend/src/validators/dataset.validator.ts's datasetInputSchema —
// excludes file_url/checksum/benchmark_score, which are system-set by the
// upload flow, not user-submitted at creation.
export interface DatasetInput {
  version?: string;
  file_format?: string;
  record_count?: number;
  annotation_type?: string;
  domain?: string;
  collection_year?: number;
  data_source?: string;
  methodology?: string;
  parent_dataset_slug?: string;
}

// Mirrors backend/src/validators/paper.validator.ts's paperInputSchema.
export interface PaperInput {
  abstract?: string;
  authors?: string[];
  venue?: string;
  year?: number;
  doi?: string;
  arxiv_id?: string;
  pdf_url?: string;
  code_url?: string;
}

// Mirrors backend/src/validators/tool.validator.ts's toolInputSchema.
export interface ToolInput {
  tool_type?: ToolType;
  platform?: string;
  demo_url?: string;
  install_command?: string;
}

// Mirrors backend/src/validators/model.validator.ts's modelInputSchema.
export interface ModelInput {
  architecture?: string;
  base_model?: string;
  format?: ModelFormat;
  quantization?: string;
  context_length?: number;
  parameters?: string;
  precision?: string;
  gpu_requirement?: string;
  ram_requirement?: string;
  benchmark_score?: Record<string, unknown>;
  inference_example?: string;
  version?: string;
  changelog?: string;
  demo_url?: string;
  repository_url?: string;
  paper_url?: string;
  parent_model_slug?: string;
}

// Mirrors backend/src/validators/prompt.validator.ts's promptInputSchema.
export interface PromptInput {
  role?: PromptRole;
  content?: string;
  target_platforms?: string[];
  variables?: PromptVariable[];
  difficulty?: PromptDifficulty;
  example_output?: string;
  version?: string;
  parent_prompt_slug?: string;
}

// Mirrors backend/src/validators/resource.validator.ts's createResourceSchema.
export interface CreateResourceInput {
  title: string;
  description?: string;
  type: ResourceType;
  category_id?: number;
  tags?: string[];
  language?: ResourceLanguage;
  license?: string;
  external_url?: string;
  thumbnail_url?: string;
  visibility?: ResourceVisibility;
  dataset?: DatasetInput;
  paper?: PaperInput;
  tool?: ToolInput;
  model?: ModelInput;
  prompt?: PromptInput;
}

// Mirrors backend/src/validators/resource.validator.ts's updateResourceSchema
// (createResourceSchema.partial()) — every field optional, `type` included
// but never actually sent (a resource's type can't change after creation).
export type UpdateResourceInput = Partial<CreateResourceInput>;

// Mirrors backend/src/services/resources.service.ts's UploadKind.
export type UploadKind = 'dataset' | 'thumbnail' | 'pdf' | 'asset' | 'documentation' | 'model';

export interface CreateResourceResult {
  id: string;
  slug: string;
  status: ResourceStatus;
  message: string;
}

// Mirrors backend/src/services/resources.service.ts's getVersionChain() DTO
// (Phase 3A.1) — one entry per resource in the version chain, oldest first.
export interface ResourceVersionEntry {
  id: string;
  slug: string;
  title: string;
  type: ResourceType;
  version: string | null;
  author: { username: string; display_name: string | null } | null;
  status: ResourceStatus;
  published_at: string | null;
  is_current: boolean;
}

export interface ListResourcesParams {
  type?: ResourceType;
  category?: string;
  language?: ResourceLanguage;
  // Only honored by admin-authenticated requests (the public listing always
  // forces 'approved' server-side regardless of this param) — see
  // GET /admin/resources/pending, which now forwards it.
  status?: ResourceStatus;
  sort?: ResourceSort;
  featured?: true;
  // Admin-only — see ResourceService.list()'s backend comment. Silently
  // ignored (falls back to live resources) for anyone without resource:delete_any.
  deleted?: true;
  page?: number;
  limit?: number;
}
