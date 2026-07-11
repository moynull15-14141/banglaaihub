import { z } from 'zod';

const COMMENT_SORT_OPTIONS = ['newest', 'oldest', 'popular'] as const;

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
  parent_id: z.string().uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const listCommentsQuerySchema = z.object({
  sort: z.enum(COMMENT_SORT_OPTIONS).optional(),
});
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
