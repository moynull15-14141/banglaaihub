import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { AccessTokenPayload } from '../utils/jwt';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ReputationService } from './reputation.service';
import { ResourceService } from './resources.service';
import { StorageService } from './storage.service';
import type { CreateReviewInput, ListReviewsQuery, UpdateReviewInput } from '../validators/review.validator';

const REVIEW_CREATED_POINTS = 2;
const REVIEW_HELPFUL_POINTS = 1;

const reviewInclude = {
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

async function toReviewDto(
  review: ReviewWithRelations,
  viewerHasMarkedHelpful = false,
): Promise<Record<string, unknown>> {
  const authorAvatarUrl = review.author ? await StorageService.resolveAvatarUrl(review.author.avatarUrl) : null;
  return {
    id: review.id,
    resource_id: review.resourceId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    helpful_count: review.helpfulCount,
    status: review.status,
    author: review.author
      ? {
          id: review.author.id,
          username: review.author.username,
          display_name: review.author.displayName,
          avatar_url: authorAvatarUrl,
          // "Verified owner indicator" — the review author holds the site's
          // is_verified badge (verified_contributor+), not a purchase/owner
          // relationship to the resource (reviewing your own resource is
          // blocked outright, see create() below).
          is_verified: review.author.isVerified,
        }
      : null,
    is_marked_helpful: viewerHasMarkedHelpful,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  };
}

function resolveOrderBy(sort?: string): Prisma.ReviewOrderByWithRelationInput {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'helpful':
      return { helpfulCount: 'desc' };
    default:
      return { createdAt: 'desc' };
  }
}

async function recomputeResourceAggregate(resourceId: string): Promise<void> {
  const aggregate = await prisma.review.aggregate({
    where: { resourceId, status: 'visible', deletedAt: null },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      avgRating: aggregate._avg.rating,
      reviewCount: aggregate._count._all,
    },
  });
}

export class ReviewService {
  static async list(
    resourceSlug: string,
    query: ListReviewsQuery,
    pagination: PaginationParams,
    requester?: AccessTokenPayload,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);
    const where: Prisma.ReviewWhereInput = { resourceId, status: 'visible', deletedAt: null };

    const [total, reviews, helpfulVotes] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: resolveOrderBy(query.sort),
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      requester
        ? prisma.reviewHelpful.findMany({
            where: { userId: requester.userId, review: { resourceId } },
            select: { reviewId: true },
          })
        : Promise.resolve([]),
    ]);

    const helpfulReviewIds = new Set(helpfulVotes.map((vote) => vote.reviewId));

    return {
      data: await Promise.all(reviews.map((review) => toReviewDto(review, helpfulReviewIds.has(review.id)))),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  // Star distribution — computed on read (not stored) since it's only ever
  // needed on the single resource-detail page, not on list rows.
  static async getRatingSummary(resourceSlug: string): Promise<Record<string, unknown>> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: resourceId },
      select: { avgRating: true, reviewCount: true },
    });

    const distributionRows = await prisma.review.groupBy({
      by: ['rating'],
      where: { resourceId, status: 'visible', deletedAt: null },
      _count: { _all: true },
    });

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distributionRows) {
      distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count._all;
    }

    return {
      avg_rating: resource.avgRating,
      review_count: resource.reviewCount,
      distribution,
    };
  }

  static async create(
    resourceSlug: string,
    requester: AccessTokenPayload,
    input: CreateReviewInput,
  ): Promise<unknown> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: resourceId },
      select: { id: true, authorId: true },
    });

    if (resource.authorId === requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot review your own resource.');
    }

    const existing = await prisma.review.findUnique({
      where: { resourceId_authorId: { resourceId, authorId: requester.userId } },
    });
    if (existing && !existing.deletedAt) {
      throw new ApiError(409, 'CONFLICT', 'You have already reviewed this resource.');
    }

    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: {
            rating: input.rating,
            title: input.title ?? null,
            body: input.body ?? null,
            status: 'visible',
            deletedAt: null,
          },
          include: reviewInclude,
        })
      : await prisma.review.create({
          data: {
            resourceId,
            authorId: requester.userId,
            rating: input.rating,
            title: input.title ?? null,
            body: input.body ?? null,
          },
          include: reviewInclude,
        });

    await recomputeResourceAggregate(resourceId);

    await prisma.resourceAnalytics.create({
      data: { resourceId, eventType: 'review', userId: requester.userId },
    });

    if (resource.authorId) {
      await NotificationService.create({
        userId: resource.authorId,
        type: 'review_received',
        title: 'New review on your resource',
        message: `${review.rating}★ review received.`,
        link: `/resources/${resourceSlug}`,
      });
      await ActivityService.record({
        userId: resource.authorId,
        type: 'review_received',
        targetType: 'resource',
        targetId: resourceId,
        metadata: { rating: review.rating },
      });
    }

    await ActivityService.record({
      userId: requester.userId,
      type: 'review_written',
      targetType: 'resource',
      targetId: resourceId,
    });

    await ReputationService.award({
      userId: requester.userId,
      eventType: 'review_created',
      points: REVIEW_CREATED_POINTS,
      resourceId,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'review.create',
      targetType: 'review',
      targetId: review.id,
      newValue: { resourceId, rating: input.rating },
    });

    void ResourceService.syncSearchIndex(resourceId);

    return await toReviewDto(review);
  }

  static async update(
    reviewId: string,
    requester: AccessTokenPayload,
    input: UpdateReviewInput,
  ): Promise<unknown> {
    const existing = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!existing || existing.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Review not found.');
    }

    if (existing.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own review.');
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
      },
      include: reviewInclude,
    });

    if (input.rating !== undefined) {
      await recomputeResourceAggregate(existing.resourceId);
    }

    await writeAuditLog({
      actorId: requester.userId,
      action: 'review.update',
      targetType: 'review',
      targetId: reviewId,
      oldValue: { rating: existing.rating, title: existing.title, body: existing.body },
      newValue: input,
    });

    void ResourceService.syncSearchIndex(existing.resourceId);

    return await toReviewDto(review);
  }

  static async remove(reviewId: string, requester: AccessTokenPayload): Promise<void> {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Review not found.');
    }

    const isOwner = review.authorId === requester.userId;
    const permissions = await AuthService.getUserPermissions(requester.userId);
    const canDeleteAny = permissions.has('review:delete_any');

    if (!isOwner && !canDeleteAny) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this review.');
    }
    if (isOwner && !canDeleteAny && !permissions.has('review:delete_own')) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this review.');
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    await recomputeResourceAggregate(review.resourceId);

    const isModeratorAction = !isOwner;

    await writeAuditLog({
      actorId: requester.userId,
      action: isModeratorAction ? 'review.moderator_remove' : 'review.delete',
      targetType: 'review',
      targetId: reviewId,
      oldValue: { rating: review.rating, title: review.title },
    });

    if (isModeratorAction) {
      await NotificationService.create({
        userId: review.authorId,
        type: 'review_removed',
        title: 'Your review was removed',
        message: 'A moderator removed your review for violating community guidelines.',
      });
    }

    void ResourceService.syncSearchIndex(review.resourceId);
  }

  static async markHelpful(reviewId: string, requester: AccessTokenPayload): Promise<unknown> {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Review not found.');
    }

    const existing = await prisma.reviewHelpful.findUnique({
      where: { userId_reviewId: { userId: requester.userId, reviewId } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'You already marked this review as helpful.');
    }

    await prisma.$transaction([
      prisma.reviewHelpful.create({ data: { userId: requester.userId, reviewId } }),
      prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { increment: 1 } } }),
    ]);

    await prisma.resourceAnalytics.create({
      data: { resourceId: review.resourceId, eventType: 'helpful', userId: requester.userId },
    });

    await NotificationService.create({
      userId: review.authorId,
      type: 'review_helpful',
      title: 'Your review was marked helpful',
      message: 'Someone found your review helpful.',
    });

    await ReputationService.award({
      userId: review.authorId,
      eventType: 'review_helpful',
      points: REVIEW_HELPFUL_POINTS,
      resourceId: review.resourceId,
    });

    return { message: 'Review marked as helpful.' };
  }

  static async unmarkHelpful(reviewId: string, requester: AccessTokenPayload): Promise<void> {
    const existing = await prisma.reviewHelpful.findUnique({
      where: { userId_reviewId: { userId: requester.userId, reviewId } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Helpful vote not found.');
    }

    await prisma.$transaction([
      prisma.reviewHelpful.delete({ where: { id: existing.id } }),
      prisma.review.update({ where: { id: reviewId }, data: { helpfulCount: { decrement: 1 } } }),
    ]);
  }
}
