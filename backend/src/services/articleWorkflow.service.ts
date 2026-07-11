import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { AccessTokenPayload } from '../utils/jwt';
import type { ResourceStatus } from '../generated/prisma/client';
import { ActivityService } from './activity.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { resourceInclude, toResourceDto, type ResourceWithRelations } from './resources.service';

// Phase 5A-3 — Editorial Workflow. Deliberately scoped to the 6 new
// pre-publish states only (idea/draft/in_review/seo_review/needs_changes/
// ready_to_publish) plus the archived->draft restore edge. The FINAL
// transitions (ready_to_publish/draft -> approved/scheduled via
// ResourceService.publishArticle(), approved -> archived via
// ResourceService.archiveArticle()) are untouched, existing 5A-1/5A-2
// endpoints — a trusted content:publish holder can already collapse
// draft -> approved directly today, and that behavior is preserved exactly
// (no regression), rather than being routed through this new graph too.
interface TransitionEdge {
  to: ResourceStatus;
  permission: string;
  // Ownership-gated edges are the "self-service" moves a writer makes on
  // their own article; review/SEO-review edges are actioned by someone else
  // and only need the permission itself (same discipline as resource:edit_any
  // elsewhere in this codebase — a permission holder can act on ANY article,
  // not just their own).
  requireOwnership: boolean;
}

const TRANSITIONS: Partial<Record<ResourceStatus, TransitionEdge[]>> = {
  idea: [{ to: 'draft', permission: 'content:create', requireOwnership: true }],
  draft: [
    { to: 'in_review', permission: 'content:create', requireOwnership: true },
    { to: 'ready_to_publish', permission: 'content:publish', requireOwnership: false },
  ],
  in_review: [
    { to: 'needs_changes', permission: 'content:review', requireOwnership: false },
    { to: 'seo_review', permission: 'content:review', requireOwnership: false },
    { to: 'ready_to_publish', permission: 'content:publish', requireOwnership: false },
  ],
  seo_review: [
    { to: 'needs_changes', permission: 'content:seo_review', requireOwnership: false },
    { to: 'ready_to_publish', permission: 'content:seo_review', requireOwnership: false },
  ],
  needs_changes: [
    { to: 'draft', permission: 'content:create', requireOwnership: true },
    { to: 'in_review', permission: 'content:create', requireOwnership: true },
  ],
  archived: [{ to: 'draft', permission: 'content:edit', requireOwnership: false }],
};

// Which NotificationType (if any) fires on a given edge, and which
// ArticleAssignment role slot is notified — mirrors comments.service.ts's
// "notify the relevant person" pattern, just keyed by workflow edge instead
// of @mention.
const NOTIFY_ON_TRANSITION: Partial<Record<ResourceStatus, { type: 'article_review_requested' | 'article_needs_changes' | 'article_approved'; role: 'writer' | 'reviewer' | 'seo_reviewer' | 'publisher' }>> = {
  in_review: { type: 'article_review_requested', role: 'reviewer' },
  seo_review: { type: 'article_review_requested', role: 'seo_reviewer' },
  needs_changes: { type: 'article_needs_changes', role: 'writer' },
  ready_to_publish: { type: 'article_approved', role: 'publisher' },
};

export class ArticleWorkflowService {
  static async transition(slug: string, requester: AccessTokenPayload, toStatus: ResourceStatus): Promise<unknown> {
    const resource = await prisma.resource.findUnique({ where: { slug } });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    if (resource.type !== 'article') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Only articles support editorial workflow transitions.');
    }

    const edges = TRANSITIONS[resource.status] ?? [];
    const edge = edges.find((e) => e.to === toStatus);
    if (!edge) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Cannot move an article from "${resource.status}" to "${toStatus}".`,
      );
    }

    const permissions = await AuthService.getUserPermissions(requester.userId);
    if (!permissions.has(edge.permission)) {
      throw new ApiError(403, 'FORBIDDEN', `You do not have permission to perform this transition.`);
    }
    if (edge.requireOwnership && resource.authorId !== requester.userId && !permissions.has('content:edit')) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only submit or revise your own articles.');
    }

    await prisma.resource.update({ where: { id: resource.id }, data: { status: toStatus } });

    await writeAuditLog({
      actorId: requester.userId,
      action: 'article.workflow_transition',
      targetType: 'resource',
      targetId: resource.id,
      oldValue: { status: resource.status },
      newValue: { status: toStatus },
    });

    await ActivityService.record({
      userId: requester.userId,
      type: 'article_workflow_transition',
      targetType: 'resource',
      targetId: resource.id,
      metadata: { from: resource.status, to: toStatus, slug: resource.slug },
    });

    const notify = NOTIFY_ON_TRANSITION[toStatus];
    if (notify) {
      const assignment = await prisma.articleAssignment.findUnique({
        where: { resourceId_role: { resourceId: resource.id, role: notify.role } },
        select: { assignedToId: true },
      });
      const targetUserId = assignment?.assignedToId ?? (notify.role === 'writer' ? resource.authorId : null);
      if (targetUserId && targetUserId !== requester.userId) {
        await NotificationService.create({
          userId: targetUserId,
          type: notify.type,
          title: articleWorkflowNotificationTitle(notify.type, resource.title),
          link: `/admin/content/articles/${resource.slug}/edit`,
        });
      }
    }

    const withRelations = await prisma.resource.findUnique({
      where: { id: resource.id },
      include: resourceInclude,
    });
    return toResourceDto(withRelations as ResourceWithRelations);
  }

  // Which edges the requester could take right now — powers the frontend's
  // transition action menu without it needing to hardcode the graph.
  static async availableTransitions(slug: string, requester: AccessTokenPayload): Promise<{ to: ResourceStatus }[]> {
    const resource = await prisma.resource.findUnique({ where: { slug }, select: { id: true, status: true, type: true, authorId: true, deletedAt: true } });
    if (!resource || resource.deletedAt || resource.type !== 'article') return [];

    const edges = TRANSITIONS[resource.status] ?? [];
    const permissions = await AuthService.getUserPermissions(requester.userId);

    return edges
      .filter((edge) => {
        if (!permissions.has(edge.permission)) return false;
        if (edge.requireOwnership && resource.authorId !== requester.userId && !permissions.has('content:edit')) {
          return false;
        }
        return true;
      })
      .map((edge) => ({ to: edge.to }));
  }
}

function articleWorkflowNotificationTitle(type: string, title: string): string {
  switch (type) {
    case 'article_review_requested':
      return `"${title}" is ready for your review`;
    case 'article_needs_changes':
      return `"${title}" needs changes`;
    case 'article_approved':
      return `"${title}" is ready to publish`;
    default:
      return `Update on "${title}"`;
  }
}
