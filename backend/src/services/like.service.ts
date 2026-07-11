import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { ResourceService } from './resources.service';

// Resource-level likes only. Comment likes live in CommentService — this
// service mirrors UserService.addBookmark/removeBookmark's transaction +
// 409/404 shape exactly (see users.service.ts).
export class LikeService {
  static async likeResource(userId: string, resourceSlug: string): Promise<void> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);
    const resource = await prisma.resource.findUniqueOrThrow({
      where: { id: resourceId },
      select: { authorId: true },
    });

    const existing = await prisma.resourceLike.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'Resource is already liked.');
    }

    await prisma.$transaction([
      prisma.resourceLike.create({ data: { userId, resourceId } }),
      prisma.resource.update({ where: { id: resourceId }, data: { likeCount: { increment: 1 } } }),
    ]);

    await writeAuditLog({
      actorId: userId,
      action: 'resource.like',
      targetType: 'resource',
      targetId: resourceId,
    });

    await prisma.resourceAnalytics.create({
      data: { resourceId, eventType: 'like', userId },
    });

    if (resource.authorId && resource.authorId !== userId) {
      await NotificationService.create({
        userId: resource.authorId,
        type: 'resource_liked',
        title: 'Someone liked your resource',
        link: `/resources/${resourceSlug}`,
      });
      await ActivityService.record({
        userId: resource.authorId,
        type: 'like_received',
        targetType: 'resource',
        targetId: resourceId,
      });
    }

    void ResourceService.syncSearchIndex(resourceId);
  }

  static async unlikeResource(userId: string, resourceSlug: string): Promise<void> {
    const resourceId = await ResourceService.resolveIdBySlug(resourceSlug);

    const existing = await prisma.resourceLike.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Like not found.');
    }

    await prisma.$transaction([
      prisma.resourceLike.delete({ where: { id: existing.id } }),
      prisma.resource.update({ where: { id: resourceId }, data: { likeCount: { decrement: 1 } } }),
    ]);

    await writeAuditLog({
      actorId: userId,
      action: 'resource.unlike',
      targetType: 'resource',
      targetId: resourceId,
    });

    void ResourceService.syncSearchIndex(resourceId);
  }
}
