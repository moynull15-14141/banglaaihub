'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { RatingSummary } from '@/components/review/RatingSummary';
import { ReviewCard } from '@/components/review/ReviewCard';
import { ReviewForm } from '@/components/review/ReviewForm';
import { ReportResourceDialog } from '@/components/resource/ReportResourceDialog';
import { Button } from '@/components/ui/button';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Pagination } from '@/components/common/Pagination';
import { SectionHeader } from '@/components/common/SectionHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePagination } from '@/lib/hooks/usePagination';
import {
  useCreateReview,
  useDeleteReview,
  useRatingSummary,
  useReportReview,
  useReviews,
  useToggleReviewHelpful,
  useUpdateReview,
} from '@/lib/hooks/useReviews';
import { ROUTES } from '@/lib/constants/routes';
import type { ReportReason } from '@/lib/api/reviews';
import type { CreateReviewInput, ReviewSort } from '@/types/review';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

const MODERATOR_ROLES = ['moderator', 'admin', 'super_admin'];

interface ReviewsSectionProps {
  resourceSlug: string;
  resourceAuthorId: string | null;
}

export function ReviewsSection({ resourceSlug, resourceAuthorId }: ReviewsSectionProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { page, limit, setPage } = usePagination({ initialLimit: 10 });
  const [sort, setSort] = useState<ReviewSort>('newest');
  const [showForm, setShowForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const { data: summary } = useRatingSummary(resourceSlug);
  const { data: reviewsResult, isLoading, isError, refetch } = useReviews(resourceSlug, { sort, page, limit });
  const createMutation = useCreateReview(resourceSlug);
  const updateMutation = useUpdateReview(resourceSlug);
  const deleteMutation = useDeleteReview(resourceSlug);
  const helpfulMutation = useToggleReviewHelpful(resourceSlug);
  const reportMutation = useReportReview();

  const isOwnerOfResource = Boolean(user && resourceAuthorId && user.id === resourceAuthorId);
  const canModerate = Boolean(user && user.roles.some((role) => MODERATOR_ROLES.includes(role)));
  const reviews = reviewsResult?.data ?? [];
  const ownReview = reviews.find((review) => review.author?.id === user?.id);
  const editingReview = reviews.find((review) => review.id === editingReviewId);

  function handleWriteClick() {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    setShowForm(true);
  }

  function handleSubmit(input: CreateReviewInput) {
    if (editingReviewId) {
      updateMutation.mutate(
        { reviewId: editingReviewId, input },
        {
          onSuccess: () => {
            toast.success('Review updated.');
            setEditingReviewId(null);
          },
          onError: (error) => toast.error(errorMessage(error, 'Could not update your review.')),
        },
      );
      return;
    }
    createMutation.mutate(input, {
      onSuccess: () => {
        toast.success('Review submitted.');
        setShowForm(false);
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not submit your review.')),
    });
  }

  function handleDelete(reviewId: string) {
    deleteMutation.mutate(reviewId, {
      onSuccess: () => toast.success('Review removed.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not remove this review.')),
    });
  }

  function handleToggleHelpful(reviewId: string, currentlyMarked: boolean) {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    helpfulMutation.mutate(
      { reviewId, mark: !currentlyMarked },
      { onError: (error) => toast.error(errorMessage(error, 'Could not update your helpful vote.')) },
    );
  }

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <SectionHeader title="Reviews & Ratings" />

      {summary ? <RatingSummary summary={summary} /> : null}

      {!ownReview && !isOwnerOfResource ? (
        showForm ? (
          <ReviewForm
            isPending={createMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <Button type="button" variant="outline" onClick={handleWriteClick}>
            Write a review
          </Button>
        )
      ) : null}

      {reviews.length > 1 ? (
        <div className="flex justify-end">
          <FilterSelect value={sort} onChange={(event) => setSort(event.target.value as ReviewSort)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="helpful">Most helpful</option>
          </FilterSelect>
        </div>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : isError ? (
        <ErrorState title="Couldn't load reviews" onRetry={() => void refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Be the first to share your thoughts on this resource." />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) =>
            editingReviewId === review.id ? (
              <ReviewForm
                key={review.id}
                initial={editingReview}
                isPending={updateMutation.isPending}
                onSubmit={handleSubmit}
                onCancel={() => setEditingReviewId(null)}
              />
            ) : (
              <ReviewCard
                key={review.id}
                review={review}
                isOwn={review.author?.id === user?.id}
                canModerate={canModerate}
                onEdit={() => setEditingReviewId(review.id)}
                onDelete={() => handleDelete(review.id)}
                onToggleHelpful={() => handleToggleHelpful(review.id, review.is_marked_helpful)}
                onReport={() => {
                  if (!isAuthenticated) {
                    router.push(ROUTES.login);
                    return;
                  }
                  setReportTargetId(review.id);
                }}
                isHelpfulPending={helpfulMutation.isPending}
                isDeletePending={deleteMutation.isPending}
              />
            ),
          )}
        </div>
      )}

      {reviewsResult ? (
        <Pagination
          page={page}
          limit={limit}
          total={reviewsResult.meta.total ?? 0}
          onPageChange={setPage}
        />
      ) : null}

      <ReportResourceDialog
        open={reportTargetId !== null}
        onOpenChange={(open) => setReportTargetId(open ? reportTargetId : null)}
        resourceTitle="this review"
        isPending={reportMutation.isPending}
        onConfirm={(input: { reason: ReportReason; description?: string }) => {
          if (!reportTargetId) return;
          reportMutation.mutate(
            { reviewId: reportTargetId, input },
            {
              onSuccess: () => {
                toast.success('Report submitted — a moderator will review it.');
                setReportTargetId(null);
              },
              onError: (error) => toast.error(errorMessage(error, 'Could not submit your report.')),
            },
          );
        }}
      />
    </section>
  );
}
