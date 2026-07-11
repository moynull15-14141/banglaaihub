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
import type { CreateCommentInput, ListCommentsQuery, UpdateCommentInput } from '../validators/comment.validator';

const COMMENT_CREATED_POINTS = 1;
// @username — 3-30 chars, matches USER.username's own VARCHAR(50)/registration
// rules closely enough for parse-only detection (no live autocomplete this phase).
const MENTION_PATTERN = /@([a-zA-Z0-9_]{3,30})/g;

const commentAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const commentInclude = {
  author: { select: commentAuthorSelect },
} satisfies Prisma.CommentInclude;

type CommentWithAuthor = Prisma.CommentGetPayload<{ include: typeof commentInclude }>;

interface CommentNode {
  id: string;
  resource_id: string;
  parent_id: string | null;
  content: string | null;
  is_pinned: boolean;
  like_count: number;
  status: string;
  is_deleted: boolean;
  author: Record<string, unknown> | null;
  is_liked: boolean;
  created_at: Date;
  updated_at: Date;
  replies: CommentNode[];
}

async function toCommentNode(comment: CommentWithAuthor, likedCommentIds: Set<string>): Promise<CommentNode> {
  const isDeleted = comment.status === 'deleted';
  const authorAvatarUrl =
    !isDeleted && comment.author ? await StorageService.resolveAvatarUrl(comment.author.avatarUrl) : null;
  return {
    id: comment.id,
    resource_id: comment.resourceId,
    parent_id: comment.parentId,
    content: isDeleted ? null : comment.content,
    is_pinned: comment.isPinned,
    like_count: comment.likeCount,
    status: comment.status,
    is_deleted: isDeleted,
    author:
      !isDeleted && comment.author
        ? {
            id: comment.author.id,
            username: comment.author.username,
            display_name: comment.author.displayName,
            avatar_url: authorAvatarUrl,
            is_verified: comment.author.isVerified,
          }
        : null,
    is_liked: likedCommentIds.has(comment.id),
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
    replies: [],
  };
}

function sortReplies(nodes: CommentNode[]): void {
  nodes.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  for (const node of nodes) sortReplies(node.replies);
}

function sortTopLevel(nodes: CommentNode[], sort?: string): void {
  switch (sort) {
    case 'oldest':
      nodes.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      break;
    case 'popular':
      nodes.sort((a, b) => b.like_count - a.like_count || b.created_at.getTime() - a.created_at.getTime());
      break;
    default:
      nodes.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  }
}

export class CommentService {
  static async list(
    resourceSlug: string,
    query: ListCommentsQuery,
    pagination: PaginationParams,
    requester?: AccessTokenPayload,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);

    const [comments, likedRows] = await Promise.all([
      prisma.comment.findMany({
        where: { resourceId, status: { not: 'hidden' } },
        include: commentInclude,
      }),
      requester
        ? prisma.commentLike.findMany({
            where: { userId: requester.userId, comment: { resourceId } },
            select: { commentId: true },
          })
        : Promise.resolve([]),
    ]);

    const likedCommentIds = new Set(likedRows.map((row) => row.commentId));
    const nodesById = new Map<string, CommentNode>();
    for (const comment of comments) {
      nodesById.set(comment.id, await toCommentNode(comment, likedCommentIds));
    }

    const topLevel: CommentNode[] = [];
    for (const comment of comments) {
      const node = nodesById.get(comment.id);
      if (!node) continue;
      if (comment.parentId && nodesById.has(comment.parentId)) {
        nodesById.get(comment.parentId)!.replies.push(node);
      } else {
        topLevel.push(node);
      }
    }

    sortTopLevel(topLevel, query.sort);
    for (const node of topLevel) sortReplies(node.replies);

    const total = topLevel.length;
    const page = topLevel.slice(
      (pagination.page - 1) * pagination.limit,
      (pagination.page - 1) * pagination.limit + pagination.limit,
    );

    return { data: page, meta: buildPaginationMeta(total, pagination) };
  }

  static async create(
    resourceSlug: string,
    requester: AccessTokenPayload,
    input: CreateCommentInput,
  ): Promise<unknown> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);

    let parent: { id: string; authorId: string | null; resourceId: string } | null = null;
    if (input.parent_id) {
      parent = await prisma.comment.findUnique({
        where: { id: input.parent_id },
        select: { id: true, authorId: true, resourceId: true },
      });
      if (!parent || parent.resourceId !== resourceId) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Parent comment does not belong to this resource.');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        resourceId,
        authorId: requester.userId,
        parentId: input.parent_id ?? null,
        content: input.content,
      },
      include: commentInclude,
    });

    await prisma.resourceAnalytics.create({
      data: {
        resourceId,
        eventType: input.parent_id ? 'reply' : 'comment',
        userId: requester.userId,
      },
    });

    if (parent?.authorId && parent.authorId !== requester.userId) {
      await NotificationService.create({
        userId: parent.authorId,
        type: 'comment_reply',
        title: 'New reply to your comment',
        message: input.content.slice(0, 200),
        link: `/resources/${resourceSlug}`,
      });
      await ActivityService.record({
        userId: requester.userId,
        type: 'reply_added',
        targetType: 'comment',
        targetId: comment.id,
      });
    } else {
      await ActivityService.record({
        userId: requester.userId,
        type: 'comment_added',
        targetType: 'resource',
        targetId: resourceId,
      });
    }

    await this.notifyMentions(input.content, requester.userId, resourceSlug);

    await ReputationService.award({
      userId: requester.userId,
      eventType: 'comment_created',
      points: COMMENT_CREATED_POINTS,
      resourceId,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'comment.create',
      targetType: 'comment',
      targetId: comment.id,
      newValue: { resourceId, parentId: input.parent_id ?? null },
    });

    return await toCommentNode(comment, new Set());
  }

  private static async notifyMentions(
    content: string,
    authorId: string,
    resourceSlug: string,
  ): Promise<void> {
    const usernames = Array.from(new Set(Array.from(content.matchAll(MENTION_PATTERN), (m) => m[1])));
    if (usernames.length === 0) return;

    const mentionedUsers = await prisma.user.findMany({
      where: { username: { in: usernames }, deletedAt: null },
      select: { id: true, username: true },
    });

    await Promise.all(
      mentionedUsers
        .filter((user) => user.id !== authorId)
        .map((user) =>
          NotificationService.create({
            userId: user.id,
            type: 'mention',
            title: 'You were mentioned in a comment',
            message: content.slice(0, 200),
            link: `/resources/${resourceSlug}`,
          }),
        ),
    );
  }

  static async update(
    commentId: string,
    requester: AccessTokenPayload,
    input: UpdateCommentInput,
  ): Promise<unknown> {
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing || existing.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
    }
    if (existing.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own comment.');
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: input.content },
      include: commentInclude,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'comment.update',
      targetType: 'comment',
      targetId: commentId,
      oldValue: { content: existing.content },
      newValue: { content: input.content },
    });

    return await toCommentNode(comment, new Set());
  }

  static async remove(commentId: string, requester: AccessTokenPayload): Promise<void> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
    }

    const isOwner = comment.authorId === requester.userId;
    const permissions = await AuthService.getUserPermissions(requester.userId);
    const canDeleteAny = permissions.has('comment:delete_any');

    if (!isOwner && !canDeleteAny) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this comment.');
    }
    if (isOwner && !canDeleteAny && !permissions.has('comment:delete_own')) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this comment.');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { status: 'deleted', deletedAt: new Date() },
    });

    const isModeratorAction = !isOwner;

    await writeAuditLog({
      actorId: requester.userId,
      action: isModeratorAction ? 'comment.moderator_remove' : 'comment.delete',
      targetType: 'comment',
      targetId: commentId,
      oldValue: { content: comment.content },
    });

    if (isModeratorAction && comment.authorId) {
      await NotificationService.create({
        userId: comment.authorId,
        type: 'comment_removed',
        title: 'Your comment was removed',
        message: 'A moderator removed your comment for violating community guidelines.',
      });
    }
  }

  // Toggle for the repurposed POST /comments/:id/upvote route (comment
  // "like", not a separate upvote system — see comments.controller.ts).
  static async toggleLike(
    commentId: string,
    requester: AccessTokenPayload,
  ): Promise<{ liked: boolean }> {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
    }

    const existing = await prisma.commentLike.findUnique({
      where: { userId_commentId: { userId: requester.userId, commentId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.commentLike.delete({ where: { id: existing.id } }),
        prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }

    await prisma.$transaction([
      prisma.commentLike.create({ data: { userId: requester.userId, commentId } }),
      prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } }),
    ]);
    await prisma.resourceAnalytics.create({
      data: { resourceId: comment.resourceId, eventType: 'like', userId: requester.userId },
    });
    return { liked: true };
  }
}
