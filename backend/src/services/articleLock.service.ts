import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';
import { Prisma } from '../generated/prisma/client';

// 90s TTL — generous enough that a normal ~20s heartbeat (see frontend's
// useArticleLock.ts) survives a couple of missed beats (tab backgrounded,
// slow network) without falsely releasing, tight enough that a genuinely
// closed tab frees the lock well within a minute and a half.
const LOCK_TTL_MS = 90 * 1000;

function isStale(lastHeartbeatAt: Date): boolean {
  return Date.now() - lastHeartbeatAt.getTime() > LOCK_TTL_MS;
}

function toLockDto(lock: {
  lockedAt: Date;
  lastHeartbeatAt: Date;
  lockedBy: { id: string; username: string; displayName: string | null };
}): Record<string, unknown> {
  return {
    locked_at: lock.lockedAt,
    locked_by: {
      id: lock.lockedBy.id,
      username: lock.lockedBy.username,
      display_name: lock.lockedBy.displayName,
    },
  };
}

// No cron/job-queue infrastructure exists in this codebase (see
// scheduledPublish.job.ts's own comment on the same point) — staleness is
// computed at read time instead of expired by a background sweep.
export class ArticleLockService {
  static async getStatus(slug: string): Promise<{ locked: boolean; lock: Record<string, unknown> | null }> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const lock = await prisma.articleLock.findUnique({
      where: { resourceId: resource.id },
      include: { lockedBy: { select: { id: true, username: true, displayName: true } } },
    });

    if (!lock || isStale(lock.lastHeartbeatAt)) {
      return { locked: false, lock: null };
    }
    return { locked: true, lock: toLockDto(lock) };
  }

  // Acquire-or-heartbeat in one call — if the existing lock is stale or held
  // by the same user, it's (re)claimed; otherwise a 409-shaped ApiError is
  // thrown so the frontend can show "Currently editing by: X".
  static async acquireOrHeartbeat(slug: string, requester: AccessTokenPayload): Promise<Record<string, unknown>> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const existing = await prisma.articleLock.findUnique({
      where: { resourceId: resource.id },
      include: { lockedBy: { select: { id: true, username: true, displayName: true } } },
    });

    // No extra payload on the error itself (ApiError.details is a validation-
    // issue array, not a general carrier) — the frontend calls getStatus()
    // separately to render "Currently editing by: X" on a 409.
    if (existing && existing.lockedById !== requester.userId && !isStale(existing.lastHeartbeatAt)) {
      throw new ApiError(409, 'RESOURCE_LOCKED', 'This article is currently being edited by someone else.');
    }

    try {
      const lock = await prisma.articleLock.upsert({
        where: { resourceId: resource.id },
        update: { lockedById: requester.userId, lockedAt: new Date(), lastHeartbeatAt: new Date() },
        create: { resourceId: resource.id, lockedById: requester.userId },
        include: { lockedBy: { select: { id: true, username: true, displayName: true } } },
      });
      return toLockDto(lock);
    } catch (error) {
      // Two acquire/heartbeat calls landing within the same instant (e.g. a
      // release immediately followed by a re-acquire, or an effect firing
      // twice) can both pass the findUnique check above and then both hit
      // upsert's create branch — the second loses the race with a unique
      // violation on resourceId instead of Prisma retrying it as an update.
      // By the time we're here the row now exists, so just re-read and
      // return it instead of surfacing a 500 for a harmless double-write.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const lock = await prisma.articleLock.findUniqueOrThrow({
          where: { resourceId: resource.id },
          include: { lockedBy: { select: { id: true, username: true, displayName: true } } },
        });
        return toLockDto(lock);
      }
      throw error;
    }
  }

  static async release(slug: string, requester: AccessTokenPayload): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true } });
    if (!resource) return;

    await prisma.articleLock.deleteMany({ where: { resourceId: resource.id, lockedById: requester.userId } });
  }

  // Admin-only — the route layer enforces the permission; this just removes
  // whoever currently holds it, regardless of owner.
  static async forceRelease(slug: string, requester: AccessTokenPayload): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true } });
    if (!resource) return;

    await prisma.articleLock.deleteMany({ where: { resourceId: resource.id } });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.lock_force_release',
      targetType: 'resource',
      targetId: resource.id,
    });
  }
}
