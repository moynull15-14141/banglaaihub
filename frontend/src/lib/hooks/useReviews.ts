'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createReview,
  deleteReview,
  getRatingSummary,
  listReviews,
  markReviewHelpful,
  reportReview,
  unmarkReviewHelpful,
  updateReview,
  type ReportReason,
} from '@/lib/api/reviews';
import type { CreateReviewInput, ListReviewsParams, UpdateReviewInput } from '@/types/review';

export function useReviews(slug: string, params: ListReviewsParams = {}) {
  return useQuery({
    queryKey: ['reviews', slug, params],
    queryFn: () => listReviews(slug, params),
    enabled: Boolean(slug),
  });
}

export function useRatingSummary(slug: string) {
  return useQuery({
    queryKey: ['reviews', slug, 'summary'],
    queryFn: () => getRatingSummary(slug),
    enabled: Boolean(slug),
  });
}

// Invalidates the review list/summary and the resource itself (avg_rating/
// review_count are denormalized onto the Resource row server-side).
function useInvalidateReviews(slug: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
  };
}

export function useCreateReview(slug: string) {
  const invalidate = useInvalidateReviews(slug);
  return useMutation({
    mutationFn: (input: CreateReviewInput) => createReview(slug, input),
    onSuccess: invalidate,
  });
}

export function useUpdateReview(slug: string) {
  const invalidate = useInvalidateReviews(slug);
  return useMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: UpdateReviewInput }) =>
      updateReview(reviewId, input),
    onSuccess: invalidate,
  });
}

export function useDeleteReview(slug: string) {
  const invalidate = useInvalidateReviews(slug);
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: invalidate,
  });
}

// One mutation, `mark` flag per call — same shape either direction.
export function useToggleReviewHelpful(slug: string) {
  const invalidate = useInvalidateReviews(slug);
  return useMutation({
    mutationFn: ({ reviewId, mark }: { reviewId: string; mark: boolean }) =>
      mark ? markReviewHelpful(reviewId) : unmarkReviewHelpful(reviewId),
    onSuccess: invalidate,
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: ({ reviewId, input }: { reviewId: string; input: { reason: ReportReason; description?: string } }) =>
      reportReview(reviewId, input),
  });
}
