import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { assertProfileViewable } from '../utils/profileVisibility';

export interface RecordActivityInput {
  userId: string;
  type: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

function toActivityDto(activity: {
  id: string;
  type: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: Date;
}): Record<string, unknown> {
  return {
    id: activity.id,
    type: activity.type,
    target_type: activity.targetType,
    target_id: activity.targetId,
    metadata: activity.metadata,
    created_at: activity.createdAt,
  };
}

export class ActivityService {
  // Thin insert — called from other services alongside the real side-effect
  // (same call-site pattern as ReputationService.award). Never awaited by the
  // caller's response path when it isn't the primary effect; callers decide.
  static async record(input: RecordActivityInput): Promise<void> {
    await prisma.activity.create({
      data: {
        userId: input.userId,
        type: input.type,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  static async list(
    username: string,
    pagination: PaginationParams,
    viewerId: string | null,
    viewerIsAdmin: boolean,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    await assertProfileViewable(user, viewerId, viewerIsAdmin);

    const where = { userId: user.id };
    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: activities.map(toActivityDto), meta: buildPaginationMeta(total, pagination) };
  }

  // Groups Activity.createdAt by day for the requested year and derives
  // current/longest streak in application code — the single source for the
  // GitHub-style contribution heatmap, no separate heatmap table.
  static async heatmap(
    username: string,
    year: number,
    viewerId: string | null,
    viewerIsAdmin: boolean,
  ): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }
    await assertProfileViewable(user, viewerId, viewerIsAdmin);

    const rangeStart = new Date(Date.UTC(year, 0, 1));
    const rangeEnd = new Date(Date.UTC(year + 1, 0, 1));

    const rows = await prisma.activity.findMany({
      where: { userId: user.id, createdAt: { gte: rangeStart, lt: rangeEnd } },
      select: { createdAt: true },
    });

    const countsByDay = new Map<string, number>();
    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
    }

    const days = Array.from(countsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const { currentStreak, longestStreak } = computeStreaks(countsByDay, rangeEnd);

    return {
      year,
      total_contributions: rows.length,
      days,
      current_streak: currentStreak,
      longest_streak: longestStreak,
    };
  }
}

function computeStreaks(
  countsByDay: Map<string, number>,
  rangeEnd: Date,
): { currentStreak: number; longestStreak: number } {
  if (countsByDay.size === 0) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 0;
  let running = 0;
  let previousDate: Date | null = null;

  const sortedDates = Array.from(countsByDay.keys()).sort();
  for (const dateStr of sortedDates) {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (previousDate && date.getTime() - previousDate.getTime() === 86_400_000) {
      running += 1;
    } else {
      running = 1;
    }
    longestStreak = Math.max(longestStreak, running);
    previousDate = date;
  }

  // Current streak: walk backwards from today (or the last day with any
  // activity, whichever is earlier) while consecutive days have contributions.
  const today = new Date(Math.min(Date.now(), rangeEnd.getTime() - 1));
  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let currentStreak = 0;
  // Allow the streak to still count if today has no activity yet but
  // yesterday does (don't zero it out at the start of a new day).
  if (!countsByDay.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  while (countsByDay.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }

  return { currentStreak, longestStreak };
}
