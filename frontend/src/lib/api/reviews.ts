import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse, ResponseMeta } from '@/types/api';
import type {
  CreateReviewInput,
  ListReviewsParams,
  RatingSummary,
  Review,
  UpdateReviewInput,
} from '@/types/review';

export interface ListReviewsResult {
  data: Review[];
  meta: ResponseMeta;
}

export async function listReviews(
  slug: string,
  params: ListReviewsParams = {},
): Promise<ListReviewsResult> {
  const response = await apiClient.get<ApiSuccessResponse<Review[]>>(
    `/resources/${encodeURIComponent(slug)}/reviews`,
    { params },
  );
  return { data: response.data.data, meta: response.data.meta ?? {} };
}

export async function getRatingSummary(slug: string): Promise<RatingSummary> {
  const response = await apiClient.get<ApiSuccessResponse<RatingSummary>>(
    `/resources/${encodeURIComponent(slug)}/reviews/summary`,
  );
  return response.data.data;
}

export async function createReview(slug: string, input: CreateReviewInput): Promise<Review> {
  const response = await apiClient.post<ApiSuccessResponse<Review>>(
    `/resources/${encodeURIComponent(slug)}/reviews`,
    input,
  );
  return response.data.data;
}

export async function updateReview(reviewId: string, input: UpdateReviewInput): Promise<Review> {
  const response = await apiClient.put<ApiSuccessResponse<Review>>(
    `/reviews/${encodeURIComponent(reviewId)}`,
    input,
  );
  return response.data.data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${encodeURIComponent(reviewId)}`);
}

export async function markReviewHelpful(reviewId: string): Promise<void> {
  await apiClient.post(`/reviews/${encodeURIComponent(reviewId)}/helpful`);
}

export async function unmarkReviewHelpful(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${encodeURIComponent(reviewId)}/helpful`);
}

export type ReportReason = 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate';

export async function reportReview(
  reviewId: string,
  input: { reason: ReportReason; description?: string },
): Promise<void> {
  await apiClient.post(`/reviews/${encodeURIComponent(reviewId)}/report`, input);
}
