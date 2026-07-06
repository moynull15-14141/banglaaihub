import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

const RECENT_EVENTS_LIMIT = 20;

export class ReputationService {
  static async getUserReputationSummaryByUsername(
    username: string,
  ): Promise<Record<string, unknown>> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, reputationScore: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
    }

    const userId = user.id;

    const [recentEvents, breakdown] = await Promise.all([
      prisma.reputationEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_EVENTS_LIMIT,
      }),
      prisma.reputationEvent.groupBy({
        by: ['eventType'],
        where: { userId },
        _sum: { points: true },
        _count: { _all: true },
      }),
    ]);

    return {
      total_score: user.reputationScore,
      recent_events: recentEvents.map((event) => ({
        id: event.id,
        event_type: event.eventType,
        points: event.points,
        description: event.description,
        created_at: event.createdAt,
      })),
      breakdown: breakdown.map((row) => ({
        event_type: row.eventType,
        total_points: row._sum.points ?? 0,
        count: row._count._all,
      })),
    };
  }
}
