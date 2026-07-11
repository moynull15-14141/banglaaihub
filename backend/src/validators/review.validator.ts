import { z } from 'zod';

const REVIEW_SORT_OPTIONS = ['newest', 'oldest', 'helpful'] as const;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).trim().optional(),
  body: z.string().max(5000).trim().optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = createReviewSchema.partial();
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const listReviewsQuerySchema = z.object({
  sort: z.enum(REVIEW_SORT_OPTIONS).optional(),
});
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
