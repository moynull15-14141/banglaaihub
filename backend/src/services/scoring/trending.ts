import { prisma } from '../../config/database';

// Weighted score over ResourceAnalytics events in a rolling window
// (download=3, bookmark=2, share=2, view=1), computed in JS rather than raw
// SQL — consistent with the rest of this codebase. Shared by
// resources.service.ts's `sort=trending` and feed.service.ts's trending
// signal, so the weighting only lives in one place.
export const TRENDING_WINDOW_DAYS = 7;

const TRENDING_EVENT_WEIGHTS: Record<string, number> = {
  download: 3,
  bookmark: 2,
  share: 2,
  view: 1,
};

export async function computeTrendingScores(
  candidateIds: string[],
  windowDays: number = TRENDING_WINDOW_DAYS,
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (const id of candidateIds) scores.set(id, 0);
  if (candidateIds.length === 0) return scores;

  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const grouped = await prisma.resourceAnalytics.groupBy({
    by: ['resourceId', 'eventType'],
    where: { resourceId: { in: candidateIds }, createdAt: { gte: since } },
    _count: { _all: true },
  });

  for (const row of grouped) {
    const weight = TRENDING_EVENT_WEIGHTS[row.eventType] ?? 0;
    scores.set(row.resourceId, (scores.get(row.resourceId) ?? 0) + weight * row._count._all);
  }

  return scores;
}
