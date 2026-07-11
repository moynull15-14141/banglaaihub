import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Resource, ResourceStatus } from '@/types/resource';

// --- Workflow transitions ---------------------------------------------------

export async function transitionArticle(slug: string, toStatus: ResourceStatus): Promise<Resource> {
  const response = await apiClient.post<ApiSuccessResponse<Resource>>(
    `/resources/${encodeURIComponent(slug)}/workflow-transition`,
    { to_status: toStatus },
  );
  return response.data.data;
}

export async function getAvailableTransitions(slug: string): Promise<{ to: ResourceStatus }[]> {
  const response = await apiClient.get<ApiSuccessResponse<{ to: ResourceStatus }[]>>(
    `/resources/${encodeURIComponent(slug)}/workflow-transitions`,
  );
  return response.data.data;
}

// --- Assignments -------------------------------------------------------------

export type AssignmentRole = 'writer' | 'reviewer' | 'seo_reviewer' | 'publisher';
export type AssignmentStatus = 'pending' | 'in_progress' | 'done';

export interface ArticleAssignment {
  id: string;
  role: AssignmentRole;
  assigned_at: string;
  due_date: string | null;
  status: AssignmentStatus;
  assigned_to: { id: string; username: string; display_name: string | null };
  assigned_by: { id: string; username: string; display_name: string | null };
}

export interface AssignedToMeEntry {
  role: AssignmentRole;
  status: AssignmentStatus;
  due_date: string | null;
  assigned_at: string;
  resource: { slug: string; title: string; status: ResourceStatus; updated_at: string };
}

export async function listAssignments(slug: string): Promise<ArticleAssignment[]> {
  const response = await apiClient.get<ApiSuccessResponse<ArticleAssignment[]>>(
    `/resources/${encodeURIComponent(slug)}/assignments`,
  );
  return response.data.data;
}

export async function assignArticle(
  slug: string,
  input: { role: AssignmentRole; assigned_to_id: string; due_date?: string },
): Promise<ArticleAssignment> {
  const response = await apiClient.post<ApiSuccessResponse<ArticleAssignment>>(
    `/resources/${encodeURIComponent(slug)}/assignments`,
    input,
  );
  return response.data.data;
}

export async function unassignArticle(slug: string, role: AssignmentRole): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/assignments`, { params: { role } });
}

export async function listAssignedToMe(): Promise<AssignedToMeEntry[]> {
  const response = await apiClient.get<ApiSuccessResponse<AssignedToMeEntry[]>>('/resources/assigned-to-me');
  return response.data.data;
}

// --- Editorial comments / notes ----------------------------------------------

export type EditorialCommentKind = 'comment' | 'note';

export interface EditorialComment {
  id: string;
  content: string;
  kind: EditorialCommentKind;
  resolved: boolean;
  resolved_by: { username: string; display_name: string | null } | null;
  resolved_at: string | null;
  author: { id: string; username: string; display_name: string | null } | null;
  created_at: string;
  updated_at: string;
  replies: EditorialComment[];
}

export async function listEditorialComments(slug: string, kind?: EditorialCommentKind): Promise<EditorialComment[]> {
  const response = await apiClient.get<ApiSuccessResponse<EditorialComment[]>>(
    `/resources/${encodeURIComponent(slug)}/editorial-comments`,
    { params: kind ? { kind } : undefined },
  );
  return response.data.data;
}

export async function createEditorialComment(
  slug: string,
  input: { content: string; kind?: EditorialCommentKind; parent_id?: string },
): Promise<EditorialComment> {
  const response = await apiClient.post<ApiSuccessResponse<EditorialComment>>(
    `/resources/${encodeURIComponent(slug)}/editorial-comments`,
    input,
  );
  return response.data.data;
}

export async function resolveEditorialComment(commentId: string, resolved: boolean): Promise<EditorialComment> {
  const response = await apiClient.patch<ApiSuccessResponse<EditorialComment>>(
    `/resources/editorial-comments/${encodeURIComponent(commentId)}/resolve`,
    { resolved },
  );
  return response.data.data;
}

export async function deleteEditorialComment(commentId: string): Promise<void> {
  await apiClient.delete(`/resources/editorial-comments/${encodeURIComponent(commentId)}`);
}

// --- Content locking -----------------------------------------------------------

export interface ArticleLockInfo {
  locked_at: string;
  locked_by: { id: string; username: string; display_name: string | null };
}

export async function getLockStatus(slug: string): Promise<{ locked: boolean; lock: ArticleLockInfo | null }> {
  const response = await apiClient.get<ApiSuccessResponse<{ locked: boolean; lock: ArticleLockInfo | null }>>(
    `/resources/${encodeURIComponent(slug)}/lock`,
  );
  return response.data.data;
}

export async function acquireLock(slug: string): Promise<ArticleLockInfo> {
  const response = await apiClient.post<ApiSuccessResponse<ArticleLockInfo>>(
    `/resources/${encodeURIComponent(slug)}/lock`,
  );
  return response.data.data;
}

export async function releaseLock(slug: string): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/lock`);
}

export async function forceReleaseLock(slug: string): Promise<void> {
  await apiClient.delete(`/resources/${encodeURIComponent(slug)}/lock/force`);
}

// --- Revisions -----------------------------------------------------------------

export interface ArticleRevision {
  id: string;
  version_number: number;
  title: string;
  body: string | null;
  excerpt: string | null;
  category_id: number | null;
  focus_keyword: string | null;
  seo_title: string | null;
  seo_description: string | null;
  summary: string | null;
  created_at: string;
  editor: { id: string; username: string; display_name: string | null } | null;
}

export interface RevisionDiffOp {
  type: 'equal' | 'added' | 'removed';
  value: string;
}

export async function listRevisions(slug: string): Promise<ArticleRevision[]> {
  const response = await apiClient.get<ApiSuccessResponse<ArticleRevision[]>>(
    `/resources/${encodeURIComponent(slug)}/revisions`,
  );
  return response.data.data;
}

export async function compareRevisions(
  revisionId: string,
  against: string,
): Promise<{ title: RevisionDiffOp[]; body: RevisionDiffOp[] }> {
  const response = await apiClient.get<ApiSuccessResponse<{ title: RevisionDiffOp[]; body: RevisionDiffOp[] }>>(
    `/resources/revisions/${encodeURIComponent(revisionId)}/compare`,
    { params: { against } },
  );
  return response.data.data;
}

export async function restoreRevision(revisionId: string): Promise<{ slug: string }> {
  const response = await apiClient.post<ApiSuccessResponse<{ slug: string }>>(
    `/resources/revisions/${encodeURIComponent(revisionId)}/restore`,
  );
  return response.data.data;
}
