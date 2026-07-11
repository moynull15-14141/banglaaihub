// One-time backfill: the Activity table (which powers the contribution
// heatmap / streaks on the profile page) only started being written to once
// ActivityService.record() calls were added to resources/review/follow
// services. Anything created before that point — resource submissions,
// reviews, follows — has no Activity row and so is invisible on the
// heatmap even though the resource/review/follow itself still exists.
// This mirrors each live record() call site exactly (same `type` string),
// dated at the original event's own timestamp, and skips anything that
// would duplicate a row already recorded live.
import { prisma } from '../src/config/database';

async function main() {
  let inserted = 0;

  const resources = await prisma.resource.findMany({
    where: { authorId: { not: null }, deletedAt: null },
    select: { id: true, authorId: true, type: true, status: true, createdAt: true, approvedAt: true },
  });
  for (const resource of resources) {
    if (!resource.authorId) continue;
    inserted += await backfillOne({
      userId: resource.authorId,
      type: resource.type === 'model' ? 'model_uploaded' : 'resource_uploaded',
      targetType: 'resource',
      targetId: resource.id,
      createdAt: resource.createdAt,
    });
    if (resource.status === 'approved' && resource.approvedAt) {
      inserted += await backfillOne({
        userId: resource.authorId,
        type: 'resource_approved',
        targetType: 'resource',
        targetId: resource.id,
        createdAt: resource.approvedAt,
      });
    }
  }

  const reviews = await prisma.review.findMany({
    select: { id: true, authorId: true, resourceId: true, rating: true, createdAt: true },
  });
  for (const review of reviews) {
    inserted += await backfillOne({
      userId: review.authorId,
      type: 'review_written',
      targetType: 'resource',
      targetId: review.resourceId,
      createdAt: review.createdAt,
    });
  }

  const follows = await prisma.follow.findMany({
    select: { followerId: true, followingId: true, createdAt: true },
  });
  for (const follow of follows) {
    inserted += await backfillOne({
      userId: follow.followerId,
      type: 'started_following',
      targetType: 'user',
      targetId: follow.followingId,
      createdAt: follow.createdAt,
    });
  }

  console.log(`Backfilled ${inserted} activity row(s).`);
}

async function backfillOne(row: {
  userId: string;
  type: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
}): Promise<number> {
  const existing = await prisma.activity.findFirst({
    where: { userId: row.userId, type: row.type, targetType: row.targetType, targetId: row.targetId },
  });
  if (existing) return 0;

  await prisma.activity.create({
    data: {
      userId: row.userId,
      type: row.type,
      targetType: row.targetType,
      targetId: row.targetId,
      createdAt: row.createdAt,
    },
  });
  return 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
