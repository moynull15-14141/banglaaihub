import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';
import type { AssignmentRole } from '../generated/prisma/client';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';

function toAssignmentDto(assignment: {
  id: string;
  role: string;
  assignedAt: Date;
  dueDate: Date | null;
  status: string;
  assignedTo: { id: string; username: string; displayName: string | null };
  assignedBy: { id: string; username: string; displayName: string | null };
}): Record<string, unknown> {
  return {
    id: assignment.id,
    role: assignment.role,
    assigned_at: assignment.assignedAt,
    due_date: assignment.dueDate,
    status: assignment.status,
    assigned_to: {
      id: assignment.assignedTo.id,
      username: assignment.assignedTo.username,
      display_name: assignment.assignedTo.displayName,
    },
    assigned_by: {
      id: assignment.assignedBy.id,
      username: assignment.assignedBy.username,
      display_name: assignment.assignedBy.displayName,
    },
  };
}

export class ArticleAssignmentService {
  static async list(slug: string): Promise<unknown[]> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const assignments = await prisma.articleAssignment.findMany({
      where: { resourceId: resource.id },
      include: {
        assignedTo: { select: { id: true, username: true, displayName: true } },
        assignedBy: { select: { id: true, username: true, displayName: true } },
      },
    });
    return assignments.map(toAssignmentDto);
  }

  // Upsert on [resourceId, role] — reassigning a slot replaces it, it never
  // grows a history of stale assignees (see the schema comment).
  static async assign(
    slug: string,
    requester: AccessTokenPayload,
    input: { role: AssignmentRole; assigned_to_id: string; due_date?: string },
  ): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, title: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const assignee = await prisma.user.findUnique({ where: { id: input.assigned_to_id }, select: { id: true } });
    if (!assignee) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Assignee not found.');
    }

    const assignment = await prisma.articleAssignment.upsert({
      where: { resourceId_role: { resourceId: resource.id, role: input.role } },
      update: {
        assignedToId: input.assigned_to_id,
        assignedById: requester.userId,
        assignedAt: new Date(),
        dueDate: input.due_date ? new Date(input.due_date) : null,
        status: 'pending',
      },
      create: {
        resourceId: resource.id,
        role: input.role,
        assignedToId: input.assigned_to_id,
        assignedById: requester.userId,
        dueDate: input.due_date ? new Date(input.due_date) : null,
      },
      include: {
        assignedTo: { select: { id: true, username: true, displayName: true } },
        assignedBy: { select: { id: true, username: true, displayName: true } },
      },
    });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.assign',
      targetType: 'resource',
      targetId: resource.id,
      newValue: { role: input.role, assigned_to_id: input.assigned_to_id },
    });

    await ActivityService.record({
      userId: requester.userId,
      type: 'article_assigned',
      targetType: 'resource',
      targetId: resource.id,
      metadata: { role: input.role, assignedToId: input.assigned_to_id },
    });

    if (input.assigned_to_id !== requester.userId) {
      await NotificationService.create({
        userId: input.assigned_to_id,
        type: 'article_assigned',
        title: `You were assigned as ${input.role.replace('_', ' ')} on "${resource.title}"`,
        link: `/admin/content/articles/${slug}/edit`,
      });
    }

    return toAssignmentDto(assignment);
  }

  static async unassign(slug: string, requester: AccessTokenPayload, role: AssignmentRole): Promise<void> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, type: true } });
    if (!resource || resource.type !== 'article') {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    await prisma.articleAssignment.deleteMany({ where: { resourceId: resource.id, role } });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.unassign',
      targetType: 'resource',
      targetId: resource.id,
      oldValue: { role },
    });
  }

  // "Assigned to me" — powers the Editorial Dashboard's own section without
  // a new aggregate endpoint.
  static async listAssignedToMe(userId: string): Promise<unknown[]> {
    const assignments = await prisma.articleAssignment.findMany({
      where: { assignedToId: userId, resource: { deletedAt: null } },
      include: {
        resource: { select: { slug: true, title: true, status: true, updatedAt: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((a) => ({
      role: a.role,
      status: a.status,
      due_date: a.dueDate,
      assigned_at: a.assignedAt,
      resource: {
        slug: a.resource.slug,
        title: a.resource.title,
        status: a.resource.status,
        updated_at: a.resource.updatedAt,
      },
    }));
  }
}
