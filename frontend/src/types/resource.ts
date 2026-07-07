export type ResourceType =
  | 'dataset'
  | 'paper'
  | 'tool'
  | 'tutorial'
  | 'prompt'
  | 'project'
  | 'news';

export type ResourceLanguage = 'bn' | 'en' | 'both';
export type ResourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ResourceSort = 'newest' | 'oldest' | 'popular' | 'downloads' | 'bookmarks';
export type ToolType = 'library' | 'api' | 'model' | 'prompt' | 'tutorial';

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
}

export interface Resource {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: ResourceType;
  status: ResourceStatus;
  visibility: string;
  language: ResourceLanguage;
  license: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
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
  dataset: DatasetMetadata | null;
  paper: PaperMetadata | null;
  tool: ToolMetadata | null;
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
  page?: number;
  limit?: number;
}
