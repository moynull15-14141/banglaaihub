import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import type { ListReportsQuery } from '../validators/admin.validator';

const reportInclude = {
  resource: { select: { id: true, slug: true, title: true, type: true } },
  comment: {
    select: {
      id: true,
      content: true,
      resource: { select: { id: true, slug: true, title: true } },
    },
  },
  review: {
    select: {
      id: true,
      title: true,
      rating: true,
      resource: { select: { id: true, slug: true, title: true } },
    },
  },
  post: { select: { id: true, content: true } },
  reporter: { select: { id: true, username: true, displayName: true } },
  reviewer: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.ReportInclude;

type ReportWithRelations = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

// A report targets at most one of resource/comment/review/post — enforced by
// the DB CHECK constraint (see the add_reviews_likes_moderation migration
// and its post_id extension in update_report_target_check).
export interface ReportTarget {
  resourceId?: string;
  commentId?: string;
  reviewId?: string;
  postId?: string;
}

function resolveTargetType(target: ReportTarget): 'resource' | 'comment' | 'review' | 'post' {
  if (target.commentId) return 'comment';
  if (target.reviewId) return 'review';
  if (target.postId) return 'post';
  return 'resource';
}

function toReportDto(report: ReportWithRelations): Record<string, unknown> {
  const targetType = report.commentId
    ? 'comment'
    : report.reviewId
      ? 'review'
      : report.postId
        ? 'post'
        : 'resource';

  return {
    id: report.id,
    reason: report.reason,
    description: report.description,
    status: report.status,
    target_type: targetType,
    resource: report.resource,
    comment: report.comment
      ? {
          id: report.comment.id,
          content: report.comment.content,
          resource: report.comment.resource,
        }
      : null,
    review: report.review
      ? {
          id: report.review.id,
          title: report.review.title,
          rating: report.review.rating,
          resource: report.review.resource,
        }
      : null,
    post: report.post ? { id: report.post.id, content: report.post.content } : null,
    reporter: report.reporter
      ? { id: report.reporter.id, username: report.reporter.username, display_name: report.reporter.displayName }
      : null,
    reviewer: report.reviewer
      ? { id: report.reviewer.id, username: report.reviewer.username, display_name: report.reviewer.displayName }
      : null,
    reviewed_at: report.reviewedAt,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  };
}

export class ReportService {
  static async create(
    reporterId: string,
    target: ReportTarget,
    reason: 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate',
    description?: string,
  ): Promise<unknown> {
    const targetType = resolveTargetType(target);

    if (targetType === 'resource') {
      const resource = await prisma.resource.findUnique({ where: { id: target.resourceId } });
      if (!resource || resource.deletedAt) {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
      }
    } else if (targetType === 'comment') {
      const comment = await prisma.comment.findUnique({ where: { id: target.commentId } });
      if (!comment || comment.status === 'deleted') {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
      }
    } else if (targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: target.postId } });
      if (!post || post.status === 'deleted') {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Post not found.');
      }
    } else {
      const review = await prisma.review.findUnique({ where: { id: target.reviewId } });
      if (!review || review.deletedAt) {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Review not found.');
      }
    }

    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        status: 'pending',
        resourceId: target.resourceId ?? null,
        commentId: target.commentId ?? null,
        reviewId: target.reviewId ?? null,
        postId: target.postId ?? null,
      },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'You already have a pending report for this.');
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        resourceId: target.resourceId ?? null,
        commentId: target.commentId ?? null,
        reviewId: target.reviewId ?? null,
        postId: target.postId ?? null,
        reason,
        description: description ?? null,
      },
      include: reportInclude,
    });

    await writeAuditLog({
      actorId: reporterId,
      action: 'report.create',
      targetType,
      targetId: target.resourceId ?? target.commentId ?? target.reviewId ?? target.postId ?? null,
      newValue: { reportId: report.id, reason },
    });

    return toReportDto(report);
  }

  static async list(
    query: ListReportsQuery,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reason) where.reason = query.reason;
    if (query.target_type === 'comment') where.commentId = { not: null };
    else if (query.target_type === 'review') where.reviewId = { not: null };
    else if (query.target_type === 'post') where.postId = { not: null };
    else if (query.target_type === 'resource') {
      where.commentId = null;
      where.reviewId = null;
      where.postId = null;
    }

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: reports.map(toReportDto), meta: buildPaginationMeta(total, pagination) };
  }

  static async getById(id: string): Promise<unknown> {
    const report = await prisma.report.findUnique({ where: { id }, include: reportInclude });
    if (!report) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Report not found.');
    }
    return toReportDto(report);
  }

  static async updateStatus(
    id: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    reviewerId: string,
    auditAction: string,
    reason?: string,
  ): Promise<unknown> {
    const before = await prisma.report.findUnique({ where: { id } });
    if (!before) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Report not found.');
    }

    await prisma.report.update({
      where: { id },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });

    await writeAuditLog({
      actorId: reviewerId,
      action: auditAction,
      targetType: 'report',
      targetId: id,
      oldValue: { status: before.status },
      newValue: { status, reason: reason ?? null },
    });

    return this.getById(id);
  }
}
