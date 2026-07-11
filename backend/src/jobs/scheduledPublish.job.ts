import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { writeAuditLog } from '../utils/auditLog';
import { ResourceService } from '../services/resources.service';

const CHECK_INTERVAL_MS = 60 * 1000;

// Phase 5A-1 — Content Platform scheduled publish. No job-queue
// infrastructure exists in this codebase yet (confirmed by audit — zero
// CI/cron/worker setup), so this is a deliberately minimal in-process
// stopgap: a single interval, in the same server process, checking for
// articles whose `Article.scheduledAt` has passed. Good enough at this
// platform's scale; a real job queue is future infrastructure work, not a
// Phase 5A-1 concern.
async function publishDueArticles(): Promise<void> {
  const due = await prisma.resource.findMany({
    where: {
      type: 'article',
      status: 'scheduled',
      deletedAt: null,
      article: { scheduledAt: { lte: new Date() } },
    },
    select: { id: true },
  });

  for (const { id } of due) {
    try {
      await prisma.$transaction([
        prisma.resource.update({
          where: { id },
          data: { status: 'approved', approvedAt: new Date(), publishedAt: new Date() },
        }),
        prisma.article.update({ where: { resourceId: id }, data: { scheduledAt: null } }),
      ]);

      await writeAuditLog({
        actorId: null,
        action: 'article.auto_publish',
        targetType: 'resource',
        targetId: id,
        newValue: { status: 'approved' },
      });

      void ResourceService.syncSearchIndex(id);
    } catch (error) {
      logger.error('Scheduled article publish failed', {
        resourceId: id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startScheduledPublishJob(): void {
  if (interval) return;
  interval = setInterval(() => {
    void publishDueArticles();
  }, CHECK_INTERVAL_MS);
}

export function stopScheduledPublishJob(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
