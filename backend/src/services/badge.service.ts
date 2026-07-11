import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import { assertProfileViewable } from '../utils/profileVisibility';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';

function toBadgeDto(badge: { id: number; key: string; name: string; description: string; icon: string }): Record<string, unknown> {
  return { id: badge.id, key: badge.key, name: badge.name, description: badge.description, icon: badge.icon };
}

function toUserBadgeDto(
  userBadge: Prisma.UserBadgeGetPayload<{ include: { badge: true } }>,
): Record<string, unknown> {
  return {
    ...toBadgeDto(userBadge.badge),
    awarded_at: userBadge.awardedAt,
    auto_awarded: userBadge.awardedBy === null,
  };
}

export class BadgeService {
  static async listCatalog(): Promise<unknown[]> {
    const badges = await prisma.badge.findMany({ orderBy: { id: 'asc' } });
    return badges.map(toBadgeDto);
  }

  static async listForUser(
    username: string,
    viewerId: string | null,
    viewerIsAdmin: boolean,
  ): Promise<unknown[]> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    await assertProfileViewable(user, viewerId, viewerIsAdmin);

    const userBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
    return userBadges.map(toUserBadgeDto);
  }

  // Small threshold checks — called after reputation/review/comment/
  // resource-approval events, no cron. Awards whatever's newly earned and
  // fires badge_received per new badge.
  static async checkAndAwardMilestones(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) return;

    const [approvedCount, reviewCount, commentCount, existingBadgeKeys] = await Promise.all([
      prisma.resource.count({ where: { authorId: userId, status: 'approved', deletedAt: null } }),
      prisma.review.count({ where: { authorId: userId, status: 'visible', deletedAt: null } }),
      prisma.comment.count({ where: { authorId: userId, status: { not: 'deleted' } } }),
      prisma.userBadge.findMany({ where: { userId }, select: { badge: { select: { key: true } } } }),
    ]);

    const alreadyHeld = new Set(existingBadgeKeys.map((row) => row.badge.key));
    const eligibleKeys: string[] = [];

    if (user.isVerified) eligibleKeys.push('verified_contributor');
    if (approvedCount >= 1) eligibleKeys.push('first_upload');
    if (approvedCount >= 10) eligibleKeys.push('prolific_contributor');
    if (reviewCount >= 10) eligibleKeys.push('top_reviewer');
    if (commentCount >= 25) eligibleKeys.push('community_voice');
    if (user.reputationScore >= 200) eligibleKeys.push('rising_star');
    if (user.reputationScore >= 5000) eligibleKeys.push('legend');

    const newlyEligible = eligibleKeys.filter((key) => !alreadyHeld.has(key));
    if (newlyEligible.length === 0) return;

    const badges = await prisma.badge.findMany({ where: { key: { in: newlyEligible } } });

    for (const badge of badges) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id, awardedBy: null } });

      await ActivityService.record({
        userId,
        type: 'badge_received',
        targetType: 'badge',
        targetId: String(badge.id),
        metadata: { key: badge.key, name: badge.name },
      });

      await NotificationService.create({
        userId,
        type: 'badge_received',
        title: `New badge: ${badge.name}`,
        message: badge.description,
      });
    }
  }

  static async adminGrant(userId: string, badgeId: number, adminId: string): Promise<void> {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'User already has this badge.');
    }

    const badge = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Badge not found.');
    }

    await prisma.userBadge.create({ data: { userId, badgeId, awardedBy: adminId } });

    await ActivityService.record({
      userId,
      type: 'badge_received',
      targetType: 'badge',
      targetId: String(badgeId),
      metadata: { key: badge.key, name: badge.name },
    });
    await NotificationService.create({
      userId,
      type: 'badge_received',
      title: `New badge: ${badge.name}`,
      message: badge.description,
    });
    await writeAuditLog({
      actorId: adminId,
      action: 'admin.badge.grant',
      targetType: 'user',
      targetId: userId,
      newValue: { badgeId, key: badge.key },
    });
  }

  static async adminRevoke(userId: string, badgeId: number, adminId: string): Promise<void> {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });
    if (!existing) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User does not have this badge.');
    }

    await prisma.userBadge.delete({ where: { id: existing.id } });

    await writeAuditLog({
      actorId: adminId,
      action: 'admin.badge.revoke',
      targetType: 'user',
      targetId: userId,
      oldValue: { badgeId },
    });
  }

  static async adminCreateBadge(
    input: { key: string; name: string; description: string; icon: string },
    adminId: string,
  ): Promise<unknown> {
    const existing = await prisma.badge.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'A badge with this key already exists.');
    }

    const badge = await prisma.badge.create({ data: input });
    await writeAuditLog({
      actorId: adminId,
      action: 'admin.badge.create',
      targetType: 'badge',
      targetId: String(badge.id),
      newValue: input,
    });
    return toBadgeDto(badge);
  }

  static async adminUpdateBadge(
    badgeId: number,
    input: Partial<{ name: string; description: string; icon: string }>,
    adminId: string,
  ): Promise<unknown> {
    const before = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!before) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Badge not found.');
    }

    const badge = await prisma.badge.update({ where: { id: badgeId }, data: input });
    await writeAuditLog({
      actorId: adminId,
      action: 'admin.badge.update',
      targetType: 'badge',
      targetId: String(badgeId),
      oldValue: { name: before.name, description: before.description, icon: before.icon },
      newValue: input,
    });
    return toBadgeDto(badge);
  }

  static async adminDeleteBadge(badgeId: number, adminId: string): Promise<void> {
    const before = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!before) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Badge not found.');
    }

    await prisma.badge.delete({ where: { id: badgeId } });
    await writeAuditLog({
      actorId: adminId,
      action: 'admin.badge.delete',
      targetType: 'badge',
      targetId: String(badgeId),
      oldValue: { key: before.key },
    });
  }
}
