import type { ResourceAuthor } from './resource';

// Mirrors backend/src/validators/review.validator.ts and review.service.ts's toReviewDto.
export type ReviewSort = 'newest' | 'oldest' | 'helpful';

export interface Review {
  id: string;
  resource_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  helpful_count: number;
  status: 'visible' | 'hidden' | 'deleted';
  author: ReviewAuthor | null;
  is_marked_helpful: boolean;
  created_at: string;
  updated_at: string;
}

// Same shape as ResourceAuthor — kept as its own alias so review-specific
// fields (e.g. a future "verified purchase" flag) can diverge without
// touching the resource author type.
export type ReviewAuthor = ResourceAuthor;

export interface RatingSummary {
  avg_rating: number | null;
  review_count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  body?: string;
}

export type UpdateReviewInput = Partial<CreateReviewInput>;

export interface ListReviewsParams {
  sort?: ReviewSort;
  page?: number;
  limit?: number;
}
