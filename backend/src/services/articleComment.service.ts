import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';

// Same mention-detection pattern as comments.service.ts's MENTION_PATTERN —
// no shared extractMentions() utility exists in this codebase (confirmed
// before writing this), so this is its own small, duplicated copy, matching
// that existing convention rather than introducing a shared-package
// extraction for one regex.
const MENTION_PATTERN = /@([a-zA-Z0-9_]{3,30})/g;

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} satisfies Prisma.UserSelect;

const commentInclude = {
  author: { select: authorSelect },
  resolvedBy: { select: authorSelect },
} satisfies Prisma.ArticleEditorialCommentInclude;

type CommentWithAuthor = Prisma.ArticleEditorialCommentGetPayload<{ include: typeof commentInclude }>;

interface CommentNode {
  id: string;
  content: string;
  kind: string;
  resolved: boolean;
  resolved_by: { username: string; display_name: string | null } | null;
  resolved_at: Date | null;
  author: { id: string; username: string; display_name: string | null } | null;
  created_at: Date;
  updated_at: Date;
  replies: CommentNode[];
}

function toNode(comment: CommentWithAuthor): CommentNode {
  return {
    id: comment.id,
    content: comment.content,
    kind: comment.kind,
    resolved: comment.resolved,
    resolved_by: comment.resolvedBy
      ? { username: comment.resolvedBy.username, display_name: comment.resolvedBy.displayName }
      : null,
    resolved_at: comment.resolvedAt,
    author: comment.author
      ? { id: comment.author.id, username: comment.author.username, display_name: comment.author.displayName }
      : null,
    created_at: comment.createdAt,
    updated_at: comment.updatedAt,
    replies: [],
  };
}

// Private, editorial-staff-only — this service is never reachable from any
// public route (see routes/articleWorkflow.routes.ts's authorize() gates),
// distinct from CommentService (comments.service.ts), which powers the
// public resource-discussion threads.
export class ArticleCommentService {
  static async list(slug: string, kind?: 'comment' | 'note'): Promise<CommentNode[]> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const comments = await prisma.articleEditorialComment.findMany({
      where: { resourceId: resource.id, deletedAt: null, ...(kind ? { kind } : {}) },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });

    const nodes = new Map<string, CommentNode>(comments.map((c) => [c.id, toNode(c)]));
    const roots: CommentNode[] = [];
    for (const comment of comments) {
      const node = nodes.get(comment.id);
      if (!node) continue;
      if (comment.parentId && nodes.has(comment.parentId)) {
        nodes.get(comment.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  static async create(
    slug: string,
    requester: AccessTokenPayload,
    input: { content: string; kind?: 'comment' | 'note'; parent_id?: string },
  ): Promise<CommentNode> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, title: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    if (input.parent_id) {
      const parent = await prisma.articleEditorialComment.findUnique({ where: { id: input.parent_id } });
      if (!parent || parent.resourceId !== resource.id) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Parent comment does not belong to this article.');
      }
    }

    const created = await prisma.articleEditorialComment.create({
      data: {
        resourceId: resource.id,
        authorId: requester.userId,
        parentId: input.parent_id ?? null,
        content: input.content,
        kind: input.kind ?? 'comment',
      },
      include: commentInclude,
    });

    await ActivityService.record({
      userId: requester.userId,
      type: input.kind === 'note' ? 'editorial_note_added' : 'editorial_comment_added',
      targetType: 'resource',
      targetId: resource.id,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.editorial_comment.create',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { comment_id: created.id, kind: created.kind },
    });

    await this.notifyMentions(input.content, resource.title, requester.userId, slug);

    return toNode(created);
  }

  static async resolve(commentId: string, requester: AccessTokenPayload, resolved: boolean): Promise<CommentNode> {
    const comment = await prisma.articleEditorialComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
    }

    const updated = await prisma.articleEditorialComment.update({
      where: { id: commentId },
      data: resolved
        ? { resolved: true, resolvedById: requester.userId, resolvedAt: new Date() }
        : { resolved: false, resolvedById: null, resolvedAt: null },
      include: commentInclude,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: resolved ? 'article.editorial_comment.resolve' : 'article.editorial_comment.unresolve',
      targetType: 'resource',
      targetId: comment.resourceId,
      newValue: { comment_id: commentId },
    });

    return toNode(updated);
  }

  static async remove(commentId: string, requester: AccessTokenPayload): Promise<void> {
    const comment = await prisma.articleEditorialComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Comment not found.');
    }
    if (comment.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own comments.');
    }

    await prisma.articleEditorialComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.editorial_comment.delete',
      targetType: 'resource',
      targetId: comment.resourceId,
      oldValue: { comment_id: commentId },
    });
  }

  // Mirrors comments.service.ts's notifyMentions() — reuses the existing
  // generic `mention` NotificationType (no new enum value needed) but points
  // `link` at the admin article editor instead of a public resource page.
  private static async notifyMentions(
    content: string,
    resourceTitle: string,
    authorId: string,
    slug: string,
  ): Promise<void> {
    const usernames = Array.from(new Set(Array.from(content.matchAll(MENTION_PATTERN), (m) => m[1])));
    if (usernames.length === 0) return;

    const users = await prisma.user.findMany({
      where: { username: { in: usernames }, deletedAt: null, id: { not: authorId } },
      select: { id: true },
    });

    await Promise.all(
      users.map((user) =>
        NotificationService.create({
          userId: user.id,
          type: 'mention',
          title: `You were mentioned in an editorial comment on "${resourceTitle}"`,
          message: content.slice(0, 200),
          link: `/admin/content/articles/${slug}/edit`,
        }),
      ),
    );
  }
}
