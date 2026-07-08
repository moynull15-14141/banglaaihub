import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import type { PaginationMeta, PaginationParams } from '../utils/pagination';
import { buildPaginationMeta } from '../utils/pagination';
import { writeAuditLog } from '../utils/auditLog';
import type { ListReportsQuery } from '../validators/admin.validator';

const reportInclude = {
  resource: { select: { id: true, slug: true, title: true, type: true } },
  reporter: { select: { id: true, username: true, displayName: true } },
  reviewer: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.ReportInclude;

type ReportWithRelations = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;

function toReportDto(report: ReportWithRelations): Record<string, unknown> {
  return {
    id: report.id,
    reason: report.reason,
    description: report.description,
    status: report.status,
    resource: report.resource,
    reporter: report.reporter
      ? { id: report.reporter.id, username: report.reporter.username, display_name: report.reporter.displayName }
      : null,
    reviewer: report.reviewer
      ? { id: report.reviewer.id, username: report.reviewer.username, display_name: report.reviewer.displayName }
      : null,
    reviewed_at: report.reviewedAt,
    created_at: report.createdAt,
    updated_at: report.updatedAt,
  };
}

export class ReportService {
  static async create(
    reporterId: string,
    resourceId: string,
    reason: 'spam' | 'copyright' | 'wrong_data' | 'duplicate' | 'inappropriate',
    description?: string,
  ): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const existing = await prisma.report.findFirst({
      where: { resourceId, reporterId, status: 'pending' },
    });
    if (existing) {
      throw new ApiError(409, 'CONFLICT', 'You already have a pending report for this resource.');
    }

    const report = await prisma.report.create({
      data: { reporterId, resourceId, reason, description: description ?? null },
      include: reportInclude,
    });

    await writeAuditLog({
      actorId: reporterId,
      action: 'report.create',
      targetType: 'resource',
      targetId: resourceId,
      newValue: { reportId: report.id, reason },
    });

    return toReportDto(report);
  }

  static async list(
    query: ListReportsQuery,
    pagination: PaginationParams,
  ): Promise<{ data: unknown[]; meta: PaginationMeta }> {
    const where: Prisma.ReportWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.reason) where.reason = query.reason;

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
    ]);

    return { data: reports.map(toReportDto), meta: buildPaginationMeta(total, pagination) };
  }

  static async getById(id: string): Promise<unknown> {
    const report = await prisma.report.findUnique({ where: { id }, include: reportInclude });
    if (!report) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Report not found.');
    }
    return toReportDto(report);
  }

  static async updateStatus(
    id: string,
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    reviewerId: string,
    auditAction: string,
    reason?: string,
  ): Promise<unknown> {
    const before = await prisma.report.findUnique({ where: { id } });
    if (!before) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Report not found.');
    }

    await prisma.report.update({
      where: { id },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });

    await writeAuditLog({
      actorId: reviewerId,
      action: auditAction,
      targetType: 'report',
      targetId: id,
      oldValue: { status: before.status },
      newValue: { status, reason: reason ?? null },
    });

    return this.getById(id);
  }
}
