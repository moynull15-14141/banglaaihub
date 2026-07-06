import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import type { ListAuditLogsQuery } from '../validators/admin.validator';

const NEW_USER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const auditLogInclude = {
  actor: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.AuditLogInclude;

type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: typeof auditLogInclude }>;

function toAuditLogDto(log: AuditLogWithActor): Record<string, unknown> {
  return {
    id: log.id,
    action: log.action,
    target_type: log.targetType,
    target_id: log.targetId,
    old_value: log.oldValue,
    new_value: log.newValue,
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
    actor: log.actor
      ? { id: log.actor.id, username: log.actor.username, display_name: log.actor.displayName }
      : null,
    created_at: log.createdAt,
  };
}

export class AdminService {
  static async listAuditLogs(
    query: ListAuditLogsQuery,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.actor_id) where.actorId = query.actor_id;
    if (query.target_type) where.targetType = query.target_type;
    if (query.action) where.action = query.action;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const orderBy: Prisma.AuditLogOrderByWithRelationInput =
      query.sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: auditLogInclude,
        orderBy,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: logs.map(toAuditLogDto), meta: buildPaginationMeta(total, pagination) };
  }

  static async getDashboard(): Promise<Record<string, unknown>> {
    const newUserSince = new Date(Date.now() - NEW_USER_WINDOW_MS);

    const [
      totalUsers,
      activeUsers,
      newUsers,
      resourcesByStatus,
      resourcesByType,
      datasetCount,
      paperCount,
      toolCount,
      bookmarkCount,
      reportsByStatus,
      notificationCount,
      reputationEventCount,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: newUserSince } } }),
      prisma.resource.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.resource.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      prisma.dataset.count(),
      prisma.paper.count(),
      prisma.tool.count(),
      prisma.bookmark.count(),
      prisma.report.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.notification.count(),
      prisma.reputationEvent.count(),
    ]);

    const statusCounts = Object.fromEntries(
      resourcesByStatus.map((row) => [row.status, row._count._all]),
    );
    const typeCounts = Object.fromEntries(resourcesByType.map((row) => [row.type, row._count._all]));
    const reportStatusCounts = Object.fromEntries(
      reportsByStatus.map((row) => [row.status, row._count._all]),
    );

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      new_users_last_7_days: newUsers,
      resources_by_status: statusCounts,
      resources_by_type: typeCounts,
      datasets: datasetCount,
      papers: paperCount,
      tools: toolCount,
      bookmarks: bookmarkCount,
      reports_by_status: reportStatusCounts,
      pending_approvals: statusCounts.pending ?? 0,
      notifications: notificationCount,
      reputation_events: reputationEventCount,
    };
  }
}
