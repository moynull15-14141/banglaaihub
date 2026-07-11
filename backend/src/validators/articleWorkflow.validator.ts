import { z } from 'zod';

const WORKFLOW_STATUSES = ['idea', 'draft', 'in_review', 'seo_review', 'needs_changes', 'ready_to_publish', 'archived'] as const;

export const workflowTransitionSchema = z.object({
  to_status: z.enum(WORKFLOW_STATUSES),
});
export type WorkflowTransitionInput = z.infer<typeof workflowTransitionSchema>;

const ASSIGNMENT_ROLES = ['writer', 'reviewer', 'seo_reviewer', 'publisher'] as const;

export const assignArticleSchema = z.object({
  role: z.enum(ASSIGNMENT_ROLES),
  assigned_to_id: z.string().uuid(),
  due_date: z.string().datetime().optional(),
});
export type AssignArticleInput = z.infer<typeof assignArticleSchema>;

export const unassignArticleQuerySchema = z.object({
  role: z.enum(ASSIGNMENT_ROLES),
});
export type UnassignArticleQuery = z.infer<typeof unassignArticleQuerySchema>;

const COMMENT_KINDS = ['comment', 'note'] as const;

export const createEditorialCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
  kind: z.enum(COMMENT_KINDS).optional(),
  parent_id: z.string().uuid().optional(),
});
export type CreateEditorialCommentInput = z.infer<typeof createEditorialCommentSchema>;

export const listEditorialCommentsQuerySchema = z.object({
  kind: z.enum(COMMENT_KINDS).optional(),
});
export type ListEditorialCommentsQuery = z.infer<typeof listEditorialCommentsQuerySchema>;

export const resolveEditorialCommentSchema = z.object({
  resolved: z.boolean(),
});
export type ResolveEditorialCommentInput = z.infer<typeof resolveEditorialCommentSchema>;

export const compareRevisionsQuerySchema = z.object({
  against: z.string().uuid(),
});
export type CompareRevisionsQuery = z.infer<typeof compareRevisionsQuerySchema>;
