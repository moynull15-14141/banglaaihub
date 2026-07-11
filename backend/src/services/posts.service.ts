import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { ReputationService } from './reputation.service';
import { StorageService, type UploadedFile } from './storage.service';
import type { CreatePostInput, UpdatePostInput } from '../validators/post.validator';

const POST_CREATED_POINTS = 1;

const postAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

export const postInclude = {
  author: { select: postAuthorSelect },
} satisfies Prisma.PostInclude;

export type PostWithAuthor = Prisma.PostGetPayload<{ include: typeof postInclude }>;

// A stored value is either a bare R2 key or a pasted http(s) URL — mirrors
// resources.service.ts's objectKeyOrNull exactly.
function objectKeyOrNull(value: string | null): string | null {
  if (!value || /^https?:\/\//i.test(value)) return null;
  return value;
}

export async function toPostDto(post: PostWithAuthor, likedByViewer = false): Promise<Record<string, unknown>> {
  const isDeleted = post.status === 'deleted';
  const authorAvatarUrl =
    !isDeleted && post.author ? await StorageService.resolveAvatarUrl(post.author.avatarUrl) : null;

  return {
    id: post.id,
    content: isDeleted ? null : post.content,
    image_url: isDeleted ? null : await StorageService.resolveUrl(post.imageUrl),
    like_count: post.likeCount,
    status: post.status,
    is_deleted: isDeleted,
    is_liked: likedByViewer,
    author:
      !isDeleted && post.author
        ? {
            id: post.author.id,
            username: post.author.username,
            display_name: post.author.displayName,
            avatar_url: authorAvatarUrl,
            is_verified: post.author.isVerified,
          }
        : null,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  };
}

export class PostService {
  static async list(
    pagination: PaginationParams,
    authorId?: string,
    requesterId?: string,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.PostWhereInput = { status: { not: 'hidden' }, deletedAt: null };
    if (authorId) where.authorId = authorId;

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    const likedIds = requesterId
      ? new Set(
          (
            await prisma.postLike.findMany({
              where: { userId: requesterId, postId: { in: posts.map((p) => p.id) } },
              select: { postId: true },
            })
          ).map((row) => row.postId),
        )
      : new Set<string>();

    return {
      data: await Promise.all(posts.map((post) => toPostDto(post, likedIds.has(post.id)))),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  static async create(requester: AccessTokenPayload, input: CreatePostInput, file?: UploadedFile): Promise<unknown> {
    let post = await prisma.post.create({
      data: { authorId: requester.userId, content: input.content },
      include: postInclude,
    });

    if (file) {
      const { key } = await StorageService.uploadPostImage(post.id, file);
      post = await prisma.post.update({ where: { id: post.id }, data: { imageUrl: key }, include: postInclude });
    }

    await ActivityService.record({
      userId: requester.userId,
      type: 'post_created',
      targetType: 'post',
      targetId: post.id,
    });

    await ReputationService.award({
      userId: requester.userId,
      eventType: 'post_created',
      points: POST_CREATED_POINTS,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'post.create',
      targetType: 'post',
      targetId: post.id,
      newValue: { hasImage: Boolean(file) },
    });

    return toPostDto(post);
  }

  static async update(postId: string, requester: AccessTokenPayload, input: UpdatePostInput): Promise<unknown> {
    const existing = await prisma.post.findUnique({ where: { id: postId } });
    if (!existing || existing.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Post not found.');
    }
    if (existing.authorId !== requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own post.');
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: { content: input.content },
      include: postInclude,
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'post.update',
      targetType: 'post',
      targetId: postId,
      oldValue: { content: existing.content },
      newValue: { content: input.content },
    });

    return toPostDto(post);
  }

  static async remove(postId: string, requester: AccessTokenPayload): Promise<void> {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Post not found.');
    }

    const isOwner = post.authorId === requester.userId;
    const permissions = await AuthService.getUserPermissions(requester.userId);
    // Reuses comment:delete_any — removing a short user-authored post is the
    // same moderation tier as removing a comment, not worth a dedicated
    // permission + RBAC seed migration for.
    const canDeleteAny = permissions.has('comment:delete_any');

    if (!isOwner && !canDeleteAny) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to delete this post.');
    }

    await prisma.post.update({ where: { id: postId }, data: { status: 'deleted', deletedAt: new Date() } });

    const isModeratorAction = !isOwner;
    await writeAuditLog({
      actorId: requester.userId,
      action: isModeratorAction ? 'post.moderator_remove' : 'post.delete',
      targetType: 'post',
      targetId: postId,
      oldValue: { content: post.content },
    });

    const imageKey = objectKeyOrNull(post.imageUrl);
    if (imageKey) {
      await StorageService.deleteObject(imageKey).catch(() => {});
    }

    if (isModeratorAction && post.authorId) {
      await NotificationService.create({
        userId: post.authorId,
        type: 'comment_removed',
        title: 'Your post was removed',
        message: 'A moderator removed your post for violating community guidelines.',
      });
    }
  }

  static async toggleLike(postId: string, requester: AccessTokenPayload): Promise<{ liked: boolean }> {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.status === 'deleted') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Post not found.');
    }

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: requester.userId, postId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.postLike.delete({ where: { id: existing.id } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }

    await prisma.$transaction([
      prisma.postLike.create({ data: { userId: requester.userId, postId } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }
}
