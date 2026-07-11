import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { AccessTokenPayload } from '../utils/jwt';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { StorageService } from './storage.service';

const FOLLOWER_MILESTONES = [10, 50, 100, 500, 1000];

async function toUserSummaryDto(user: {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  headline: string | null;
}): Promise<Record<string, unknown>> {
  return {
    id: user.id,
    username: user.username,
    display_name: user.displayName,
    avatar_url: await StorageService.resolveAvatarUrl(user.avatarUrl),
    is_verified: user.isVerified,
    headline: user.headline,
  };
}

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  isVerified: true,
  headline: true,
} as const;

export class FollowService {
  static async follow(requester: AccessTokenPayload, username: string): Promise<void> {
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target || target.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    if (target.id === requester.userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You cannot follow yourself.');
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requester.userId, followingId: target.id } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'You are already following this user.');
    }

    const [, , updatedTarget] = await prisma.$transaction([
      prisma.follow.create({ data: { followerId: requester.userId, followingId: target.id } }),
      prisma.user.update({ where: { id: requester.userId }, data: { followingCount: { increment: 1 } } }),
      prisma.user.update({
        where: { id: target.id },
        data: { followerCount: { increment: 1 } },
        select: { followerCount: true },
      }),
    ]);

    await ActivityService.record({
      userId: requester.userId,
      type: 'started_following',
      targetType: 'user',
      targetId: target.id,
    });

    const followerUser = await prisma.user.findUnique({
      where: { id: requester.userId },
      select: { username: true, displayName: true },
    });
    await NotificationService.create({
      userId: target.id,
      type: 'follow_received',
      title: 'New follower',
      message: `${followerUser?.displayName ?? followerUser?.username ?? 'Someone'} started following you.`,
      link: `/users/${followerUser?.username ?? ''}`,
    });

    if (FOLLOWER_MILESTONES.includes(updatedTarget.followerCount)) {
      await NotificationService.create({
        userId: target.id,
        type: 'milestone_reached',
        title: `You reached ${updatedTarget.followerCount} followers!`,
        message: 'Keep up the great work.',
      });
      await ActivityService.record({
        userId: target.id,
        type: 'milestone_reached',
        metadata: { milestone: 'followers', count: updatedTarget.followerCount },
      });
    }
  }

  static async unfollow(requesterId: string, username: string): Promise<void> {
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: requesterId, followingId: target.id } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'You are not following this user.');
    }

    await prisma.$transaction([
      prisma.follow.delete({ where: { id: existing.id } }),
      prisma.user.update({ where: { id: requesterId }, data: { followingCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: target.id }, data: { followerCount: { decrement: 1 } } }),
    ]);
  }

  static async listFollowers(
    username: string,
    pagination: PaginationParams,
    viewerId: string | null,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const where = { followingId: user.id };
    const [total, follows] = await Promise.all([
      prisma.follow.count({ where }),
      prisma.follow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { follower: { select: userSummarySelect } },
      }),
    ]);

    const viewerFollowingIds = viewerId ? await this.followingIdSet(viewerId) : new Set<string>();

    return {
      data: await Promise.all(
        follows.map(async (row) => ({
          ...(await toUserSummaryDto(row.follower)),
          is_following: viewerFollowingIds.has(row.follower.id),
        })),
      ),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  static async listFollowing(
    username: string,
    pagination: PaginationParams,
    viewerId: string | null,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const where = { followerId: user.id };
    const [total, follows] = await Promise.all([
      prisma.follow.count({ where }),
      prisma.follow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: { following: { select: userSummarySelect } },
      }),
    ]);

    const viewerFollowingIds = viewerId ? await this.followingIdSet(viewerId) : new Set<string>();

    return {
      data: await Promise.all(
        follows.map(async (row) => ({
          ...(await toUserSummaryDto(row.following)),
          is_following: viewerFollowingIds.has(row.following.id),
        })),
      ),
      meta: buildPaginationMeta(total, pagination),
    };
  }

  private static async followingIdSet(userId: string): Promise<Set<string>> {
    const rows = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
    return new Set(rows.map((row) => row.followingId));
  }

  static async isMutual(userIdA: string, userIdB: string): Promise<boolean> {
    const [aFollowsB, bFollowsA] = await Promise.all([
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } } }),
      prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdB, followingId: userIdA } } }),
    ]);
    return Boolean(aFollowsB) && Boolean(bFollowsA);
  }

  static async adminRemoveFollow(followId: string, adminId: string): Promise<void> {
    const follow = await prisma.follow.findUnique({ where: { id: followId } });
    if (!follow) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Follow relationship not found.');
    }

    await prisma.$transaction([
      prisma.follow.delete({ where: { id: followId } }),
      prisma.user.update({ where: { id: follow.followerId }, data: { followingCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: follow.followingId }, data: { followerCount: { decrement: 1 } } }),
    ]);

    await writeAuditLog({
      actorId: adminId,
      action: 'admin.follow.remove',
      targetType: 'follow',
      targetId: followId,
      oldValue: { followerId: follow.followerId, followingId: follow.followingId },
    });
  }
}
